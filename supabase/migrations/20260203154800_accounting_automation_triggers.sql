-- Migration : Automatisation des flux financiers
-- Description : Triggers pour synchroniser automatiquement paiements/dépenses avec la caisse

-- 1. Trigger : Créer automatiquement une entrée en caisse lors d'un paiement
CREATE OR REPLACE FUNCTION public.auto_create_caisse_on_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Créer une entrée dans tb_caisse
    INSERT INTO public.tb_caisse (
        type,
        montant,
        devise,
        source_type,
        source_id,
        description,
        date_transaction
    ) VALUES (
        'Entrée',
        NEW.montant,
        NEW.devise,
        'Paiement',
        NEW.paiement_id,
        CONCAT('Paiement mission #', NEW.mission_id, 
               CASE WHEN NEW.notes IS NOT NULL THEN ' - ' || NEW.notes ELSE '' END),
        NEW.date_paiement
    );

    RAISE NOTICE 'Entrée en caisse créée automatiquement pour paiement #%', NEW.paiement_id;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger pour les paiements
DROP TRIGGER IF EXISTS trigger_auto_caisse_paiement ON public.tb_paiements;
CREATE TRIGGER trigger_auto_caisse_paiement
    AFTER INSERT ON public.tb_paiements
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_caisse_on_paiement();

-- 2. Trigger : Créer automatiquement une sortie en caisse lors d'une dépense
CREATE OR REPLACE FUNCTION public.auto_create_caisse_on_depense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Créer une sortie dans tb_caisse
    INSERT INTO public.tb_caisse (
        type,
        montant,
        devise,
        source_type,
        source_id,
        description,
        date_transaction
    ) VALUES (
        'Sortie',
        NEW.montant,
        NEW.devise,
        'Depense',
        NEW.depense_id,
        CONCAT(NEW.categorie, 
               CASE WHEN NEW.description IS NOT NULL THEN ' - ' || NEW.description ELSE '' END),
        NEW.date_depense
    );

    RAISE NOTICE 'Sortie en caisse créée automatiquement pour dépense #%', NEW.depense_id;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger pour les dépenses
DROP TRIGGER IF EXISTS trigger_auto_caisse_depense ON public.tb_depenses;
CREATE TRIGGER trigger_auto_caisse_depense
    AFTER INSERT ON public.tb_depenses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_caisse_on_depense();

-- 3. Trigger : Mettre à jour automatiquement le solde de la mission lors d'un paiement
CREATE OR REPLACE FUNCTION public.auto_update_mission_solde()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_paiements NUMERIC(12,2);
    montant_mission NUMERIC(12,2);
BEGIN
    -- Calculer le total des paiements pour cette mission
    SELECT COALESCE(SUM(montant), 0) INTO total_paiements
    FROM public.tb_paiements
    WHERE mission_id = NEW.mission_id;

    -- Récupérer le montant total de la mission
    SELECT montant_total INTO montant_mission
    FROM public.tb_missions
    WHERE mission_id = NEW.mission_id;

    -- Mettre à jour le solde de la mission
    UPDATE public.tb_missions
    SET solde = COALESCE(montant_mission, 0) - total_paiements,
        acompte = total_paiements,
        updated_at = NOW()
    WHERE mission_id = NEW.mission_id;

    RAISE NOTICE 'Solde de la mission #% mis à jour : % payé sur %', 
        NEW.mission_id, total_paiements, montant_mission;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger pour la mise à jour du solde
DROP TRIGGER IF EXISTS trigger_update_mission_solde ON public.tb_paiements;
CREATE TRIGGER trigger_update_mission_solde
    AFTER INSERT OR UPDATE OR DELETE ON public.tb_paiements
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_update_mission_solde();

-- 4. Trigger : Créer automatiquement une dépense lors d'une maintenance terminée
CREATE OR REPLACE FUNCTION public.auto_create_depense_on_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier si la maintenance est terminée (date_fin renseignée) et a un coût
    IF NEW.date_fin IS NOT NULL AND NEW.cout_total > 0 AND 
       (OLD.date_fin IS NULL OR OLD.date_fin IS DISTINCT FROM NEW.date_fin) THEN
        
        -- Vérifier qu'une dépense n'a pas déjà été créée pour cette maintenance
        IF NOT EXISTS (
            SELECT 1 FROM public.tb_depenses 
            WHERE maintenance_id = NEW.maintenance_id
        ) THEN
            -- Créer une dépense automatiquement
            INSERT INTO public.tb_depenses (
                vehicule_id,
                maintenance_id,
                categorie,
                montant,
                devise,
                description,
                date_depense
            ) VALUES (
                NEW.vehicule_id,
                NEW.maintenance_id,
                'Maintenance',
                NEW.cout_total,
                'USD', -- Devise par défaut
                CONCAT('Maintenance: ', NEW.type_travail, 
                       CASE WHEN NEW.description_travaux IS NOT NULL THEN ' - ' || NEW.description_travaux ELSE '' END),
                NEW.date_fin
            );

            RAISE NOTICE 'Dépense créée automatiquement pour maintenance #%', NEW.maintenance_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger pour les maintenances
DROP TRIGGER IF EXISTS trigger_auto_depense_maintenance ON public.tb_maintenance;
CREATE TRIGGER trigger_auto_depense_maintenance
    AFTER INSERT OR UPDATE OF date_fin, cout_total ON public.tb_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_depense_on_maintenance();

-- 5. Trigger : Créer automatiquement une sortie en caisse lors d'un remboursement validé
CREATE OR REPLACE FUNCTION public.auto_create_caisse_on_remboursement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Créer une sortie en caisse si le remboursement est validé
    IF NEW.statut = 'Validé' AND (OLD.statut IS NULL OR OLD.statut != 'Validé') THEN
        INSERT INTO public.tb_caisse (
            type,
            montant,
            devise,
            source_type,
            source_id,
            description,
            date_transaction
        ) VALUES (
            'Sortie',
            NEW.montant,
            NEW.devise,
            'Remboursement',
            NEW.remboursement_id,
            CONCAT('Remboursement ', NEW.categorie, ' - Chauffeur #', NEW.chauffeur_id),
            NOW()
        );

        RAISE NOTICE 'Sortie en caisse créée pour remboursement #%', NEW.remboursement_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger pour les remboursements
DROP TRIGGER IF EXISTS trigger_auto_caisse_remboursement ON public.tb_remboursements;
CREATE TRIGGER trigger_auto_caisse_remboursement
    AFTER INSERT OR UPDATE OF statut ON public.tb_remboursements
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_caisse_on_remboursement();

-- Commentaires pour documentation
COMMENT ON FUNCTION public.auto_create_caisse_on_paiement() IS 'Crée automatiquement une entrée en caisse lors d''un paiement de mission';
COMMENT ON FUNCTION public.auto_create_caisse_on_depense() IS 'Crée automatiquement une sortie en caisse lors d''une dépense';
COMMENT ON FUNCTION public.auto_update_mission_solde() IS 'Met à jour automatiquement le solde d''une mission après un paiement';
COMMENT ON FUNCTION public.auto_create_depense_on_maintenance() IS 'Crée automatiquement une dépense lors d''une maintenance terminée';
COMMENT ON FUNCTION public.auto_create_caisse_on_remboursement() IS 'Crée automatiquement une sortie en caisse lors d''un remboursement validé';
