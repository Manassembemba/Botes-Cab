-- Migration : Expiration automatique des courses journalières avec caution horaire
-- Description : Ajout de la gestion de l'expiration à minuit et calcul automatique de la caution pour dépassement

-- 1. Ajout des champs pour la gestion de l'expiration et de la caution
ALTER TABLE public.tb_missions 
ADD COLUMN IF NOT EXISTS heure_expiration TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS caution_depassement NUMERIC(15, 2) DEFAULT 0;

-- 2. Ajout du tarif de caution horaire dans la table des tarifs
ALTER TABLE public.tb_tarifs 
ADD COLUMN IF NOT EXISTS tarif_caution_horaire NUMERIC(15, 2) DEFAULT 10.00;

-- 3. Mise à jour des tarifs existants avec la caution par défaut
UPDATE public.tb_tarifs 
SET tarif_caution_horaire = 10.00 
WHERE tarif_caution_horaire IS NULL;

-- 4. Fonction pour calculer et appliquer la caution de dépassement
CREATE OR REPLACE FUNCTION public.check_and_apply_overtime_caution()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    mission_record RECORD;
    heures_depassement INTEGER;
    tarif_horaire NUMERIC(15, 2);
    montant_caution NUMERIC(15, 2);
BEGIN
    -- Parcourir toutes les missions journalières actives qui ont dépassé leur heure d'expiration
    FOR mission_record IN
        SELECT m.mission_id, m.heure_expiration, m.date_arrivee_reelle, 
               m.montant_total, m.solde, m.caution_depassement,
               v.categorie, m.type_course
        FROM public.tb_missions m
        JOIN public.tb_vehicules v ON m.vehicule_id = v.vehicule_id
        WHERE m.type_course LIKE '%Journée%'
          AND m.heure_expiration IS NOT NULL
          AND m.heure_expiration < NOW()
          AND m.caution_depassement = 0  -- Pas encore de caution appliquée
          AND m.statut_mission IN ('En cours', 'Terminée')
    LOOP
        -- Récupérer le tarif de caution horaire pour cette catégorie et type de course
        SELECT tarif_caution_horaire INTO tarif_horaire
        FROM public.tb_tarifs
        WHERE categorie = mission_record.categorie
          AND type_course = mission_record.type_course
        LIMIT 1;

        -- Si pas de tarif trouvé, utiliser 10 USD par défaut
        IF tarif_horaire IS NULL THEN
            tarif_horaire := 10.00;
        END IF;

        -- Calculer le nombre d'heures de dépassement (arrondi à l'heure supérieure)
        -- Si la mission est terminée, utiliser date_arrivee_reelle, sinon NOW()
        IF mission_record.date_arrivee_reelle IS NOT NULL THEN
            heures_depassement := CEIL(
                EXTRACT(EPOCH FROM (mission_record.date_arrivee_reelle - mission_record.heure_expiration)) / 3600
            );
        ELSE
            heures_depassement := CEIL(
                EXTRACT(EPOCH FROM (NOW() - mission_record.heure_expiration)) / 3600
            );
        END IF;

        -- S'assurer que le dépassement est positif
        IF heures_depassement > 0 THEN
            -- Calculer le montant de la caution
            montant_caution := heures_depassement * tarif_horaire;

            -- Mettre à jour la mission avec la caution
            UPDATE public.tb_missions
            SET caution_depassement = montant_caution,
                solde = COALESCE(solde, 0) + montant_caution,
                updated_at = NOW()
            WHERE mission_id = mission_record.mission_id;

            -- Log pour traçabilité (optionnel)
            RAISE NOTICE 'Caution appliquée pour mission %: % heures × % = %', 
                mission_record.mission_id, heures_depassement, tarif_horaire, montant_caution;
        END IF;
    END LOOP;
END;
$$;

-- 5. Fonction trigger pour définir automatiquement l'heure d'expiration lors de la création/modification
CREATE OR REPLACE FUNCTION public.set_mission_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si c'est une course journalière, définir l'heure d'expiration à minuit du jour suivant
    IF NEW.type_course LIKE '%Journée%' THEN
        NEW.heure_expiration := DATE_TRUNC('day', NEW.date_depart_prevue) + INTERVAL '1 day';
    ELSE
        NEW.heure_expiration := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 6. Créer le trigger pour l'expiration automatique
DROP TRIGGER IF EXISTS trigger_set_mission_expiration ON public.tb_missions;
CREATE TRIGGER trigger_set_mission_expiration
    BEFORE INSERT OR UPDATE OF type_course, date_depart_prevue
    ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_mission_expiration();

-- 7. Commentaires pour documentation
COMMENT ON COLUMN public.tb_missions.heure_expiration IS 'Heure limite pour les courses journalières (minuit du jour suivant)';
COMMENT ON COLUMN public.tb_missions.caution_depassement IS 'Montant de la caution appliquée en cas de dépassement de l''heure d''expiration';
COMMENT ON COLUMN public.tb_tarifs.tarif_caution_horaire IS 'Tarif de caution par heure de dépassement (défaut: 10 USD)';

-- Note: Pour exécuter automatiquement la fonction check_and_apply_overtime_caution() tous les jours à 00h05,
-- vous devrez configurer pg_cron ou un système externe de planification.
-- Exemple avec pg_cron (si disponible):
-- SELECT cron.schedule('check-overtime-caution', '5 0 * * *', 'SELECT public.check_and_apply_overtime_caution()');
