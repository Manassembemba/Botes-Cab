-- Migration : Gestion de disponibilité par créneaux horaires
-- Description : Remplace la cardinalité stricte par une vérification de chevauchement temporel

-- 1. Fonction pour vérifier les chevauchements de missions (Time Overlap)
CREATE OR REPLACE FUNCTION public.check_mission_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    chauffeur_conflict_id INTEGER;
    vehicule_conflict_id INTEGER;
BEGIN
    -- Ignorer si la mission est annulée ou terminée
    IF NEW.statut_mission IN ('Terminée', 'Annulée') THEN
        RETURN NEW;
    END IF;

    -- Vérifier chevauchement pour le Chauffeur
    IF NEW.chauffeur_id IS NOT NULL THEN
        SELECT mission_id INTO chauffeur_conflict_id
        FROM public.tb_missions
        WHERE chauffeur_id = NEW.chauffeur_id
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF chauffeur_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le chauffeur est déjà réservé sur cette période (Conflit avec Mission #%)', chauffeur_conflict_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Vérifier chevauchement pour le Véhicule
    IF NEW.vehicule_id IS NOT NULL THEN
        SELECT mission_id INTO vehicule_conflict_id
        FROM public.tb_missions
        WHERE vehicule_id = NEW.vehicule_id
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF vehicule_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le véhicule est déjà réservé sur cette période (Conflit avec Mission #%)', vehicule_conflict_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Remplacer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_check_resource_availability ON public.tb_missions;

CREATE TRIGGER trigger_check_mission_overlap
    BEFORE INSERT OR UPDATE OF chauffeur_id, vehicule_id, date_depart_prevue, date_arrivee_prevue, statut_mission
    ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_mission_overlap();


-- 3. Fonction RPC pour obtenir les véhicules disponibles sur une plage
CREATE OR REPLACE FUNCTION public.get_available_vehicules_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_vehicules
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.tb_vehicules v
    WHERE v.statut != 'Panne' -- On exclut les véhicules en panne
      AND NOT EXISTS (
          SELECT 1 
          FROM public.tb_missions m 
          WHERE m.vehicule_id = v.vehicule_id 
            AND m.statut_mission IN ('Planifiée', 'En cours')
            AND (m.date_depart_prevue, m.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
    ORDER BY v.marque, v.modele;
$$;

-- 4. Fonction RPC pour obtenir les chauffeurs disponibles sur une plage
CREATE OR REPLACE FUNCTION public.get_available_chauffeurs_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_chauffeurs
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.tb_chauffeurs c
    WHERE c.disponibilite != 'Congé' -- On exclut les chauffeurs en congé
      AND NOT EXISTS (
          SELECT 1 
          FROM public.tb_missions m 
          WHERE m.chauffeur_id = c.chauffeur_id 
            AND m.statut_mission IN ('Planifiée', 'En cours')
            AND (m.date_depart_prevue, m.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
    ORDER BY c.nom, c.prenom;
$$;
