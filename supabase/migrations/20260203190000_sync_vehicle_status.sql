-- Migration: 20260203190000_sync_vehicle_status.sql
-- Description: Mettre à jour automatiquement le statut du véhicule lors des changements de mission.

CREATE OR REPLACE FUNCTION public.sync_vehicle_status_on_mission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cas 1: Nouvelle Mission ou Mise à jour
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Si la mission est EN COURS, le véhicule passe à 'Affecté'
        IF NEW.statut_mission = 'En cours' THEN
            UPDATE public.tb_vehicules
            SET statut = 'Affecté'
            WHERE vehicule_id = NEW.vehicule_id;
            
        -- Si la mission est PLANIFIÉE, on peut le marquer 'Réservé' ou le laisser 'Libre' mais indiquer une dispo
        -- Pour l'instant, l'utilisateur a demandé "RESERVEE", si c'est pour tout de suite. 
        -- Si la date de début est proche (ex: aujourd'hui), on pourrait mettre 'Affecté' ?
        -- Restons simple : Si 'En cours' -> Affecté.
        -- Si le statut passe à 'Terminée' ou 'Annulée', on le remet 'Libre'
        ELSIF NEW.statut_mission IN ('Terminée', 'Annulée') THEN
            -- On vérifie s'il n'y a pas D'AUTRE mission en cours avant de libérer
            IF NOT EXISTS (
                SELECT 1 FROM public.tb_missions
                WHERE vehicule_id = NEW.vehicule_id
                  AND statut_mission = 'En cours'
                  AND mission_id != NEW.mission_id
            ) THEN
                UPDATE public.tb_vehicules
                SET statut = 'Libre'
                WHERE vehicule_id = NEW.vehicule_id;
            END IF;
        END IF;
    END IF;

    -- Cas 2: Suppression de mission
    IF (TG_OP = 'DELETE') THEN
        -- Si on supprime une mission en cours, on libère le véhicule
        IF OLD.statut_mission = 'En cours' THEN
             IF NOT EXISTS (
                SELECT 1 FROM public.tb_missions
                WHERE vehicule_id = OLD.vehicule_id
                  AND statut_mission = 'En cours'
                  AND mission_id != OLD.mission_id
            ) THEN
                UPDATE public.tb_vehicules
                SET statut = 'Libre'
                WHERE vehicule_id = OLD.vehicule_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_vehicle_status ON public.tb_missions;

CREATE TRIGGER trigger_sync_vehicle_status
AFTER INSERT OR UPDATE OR DELETE
ON public.tb_missions
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_status_on_mission_change();
