-- Migration: 20260312000000_fix_client_stats_triggers.sql
-- Description: Correction des triggers pour mettre à jour les stats clients correctement

-- ============================================================================
-- 1. Mettre à jour le trigger pour qu'il se déclenche sur TOUS les UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS update_client_stats_on_mission_change ON public.tb_missions;

-- Trigger PLUS permissif - se déclenche même si OLD est NULL (INSERT)
CREATE TRIGGER update_client_stats_on_mission_change
    AFTER INSERT OR UPDATE ON public.tb_missions
    FOR EACH ROW
    WHEN (
        NEW.statut_mission = 'Terminée' 
        AND NEW.client_id IS NOT NULL
    )
    EXECUTE FUNCTION public.update_client_stats_after_mission();

COMMENT ON TRIGGER update_client_stats_on_mission_change ON public.tb_missions IS 
'Déclenche la mise à jour des stats client quand une mission passe à Terminée';

-- ============================================================================
-- 1b. Trigger séparé pour la mise à jour du statut (plus spécifique)
-- ============================================================================

DROP TRIGGER IF EXISTS update_client_stats_on_status_change ON public.tb_missions;

CREATE TRIGGER update_client_stats_on_status_change
    AFTER UPDATE OF statut_mission ON public.tb_missions
    FOR EACH ROW
    WHEN (
        NEW.statut_mission = 'Terminée' 
        AND NEW.client_id IS NOT NULL
        AND OLD.statut_mission != 'Terminée'
    )
    EXECUTE FUNCTION public.update_client_stats_after_mission();

COMMENT ON TRIGGER update_client_stats_on_status_change ON public.tb_missions IS 
'Déclenche la mise à jour des stats client quand le statut passe à Terminée';

-- ============================================================================
-- 2. Recalculer les stats pour TOUS les clients existants
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_client_stats()
RETURNS VOID AS $$
DECLARE
    client_record RECORD;
BEGIN
    -- Boucler sur tous les clients
    FOR client_record IN SELECT client_id FROM public.tb_clients
    LOOP
        -- Mettre à jour les stats pour chaque client
        PERFORM public.check_client_fidelite(client_record.client_id);
    END LOOP;
    
    RAISE NOTICE 'Stats recalculées pour tous les clients';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction immédiatement
SELECT public.recalculate_all_client_stats();

-- ============================================================================
-- 3. Vérifier et corriger les données
-- ============================================================================

-- Afficher un résumé des stats avant/après
DO $$
DECLARE
    total_clients INTEGER;
    clients_with_missions INTEGER;
    total_missions INTEGER;
    total_revenue NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_clients FROM public.tb_clients;
    
    SELECT COUNT(DISTINCT client_id) INTO clients_with_missions
    FROM public.tb_missions
    WHERE client_id IS NOT NULL AND statut_mission = 'Terminée';
    
    SELECT COUNT(*), COALESCE(SUM(montant_total), 0) 
    INTO total_missions, total_revenue
    FROM public.tb_missions
    WHERE client_id IS NOT NULL AND statut_mission = 'Terminée';
    
    RAISE NOTICE '=== Résumé des Stats Clients ===';
    RAISE NOTICE 'Total clients: %', total_clients;
    RAISE NOTICE 'Clients avec missions: %', clients_with_missions;
    RAISE NOTICE 'Missions terminées: %', total_missions;
    RAISE NOTICE 'Revenu total: $%', total_revenue;
    
    -- Vérifier les incohérences
    IF EXISTS (
        SELECT 1 FROM public.tb_clients c
        WHERE c.nb_missions_total != (
            SELECT COUNT(*) FROM public.tb_missions m
            WHERE m.client_id = c.client_id AND m.statut_mission = 'Terminée'
        )
    ) THEN
        RAISE WARNING 'ATTENTION: Certaines stats sont encore incohérentes!';
        RAISE WARNING 'Exécutez à nouveau: SELECT public.recalculate_all_client_stats();';
    ELSE
        RAISE NOTICE '✓ Toutes les stats sont cohérentes';
    END IF;
END $$;

-- ============================================================================
-- 4. Nettoyer la fonction temporaire
-- ============================================================================

DROP FUNCTION IF EXISTS public.recalculate_all_client_stats();

-- ============================================================================
-- 5. Documentation
-- ============================================================================

COMMENT ON FUNCTION public.check_client_fidelite IS 
'Met à jour les stats d''un client (nb_missions, montant_total, est_fidele)';

COMMENT ON FUNCTION public.update_client_stats_after_mission IS 
'Trigger function: appelle check_client_fidelite pour le client de la mission';

COMMENT ON COLUMN public.tb_clients.nb_missions_total IS 
'Nombre total de missions terminées pour ce client (auto-calculé)';

COMMENT ON COLUMN public.tb_clients.montant_total_depense IS 
'Montant total dépensé par ce client (auto-calculé en USD)';

COMMENT ON COLUMN public.tb_clients.derniere_mission_date IS 
'Date de la dernière mission terminée (auto-calculé)';
