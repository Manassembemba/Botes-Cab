-- Migration: 20260203194000_sync_chauffeur_status.sql
-- Description: Mettre à jour automatiquement la disponibilité du chauffeur lors des changements de mission.

CREATE OR REPLACE FUNCTION public.sync_chauffeur_status_on_mission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cas 1: Nouvelle Mission ou Mise à jour
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        
        -- A. Gestion du changement de chauffeur (si Update)
        IF (TG_OP = 'UPDATE' AND OLD.chauffeur_id IS DISTINCT FROM NEW.chauffeur_id) THEN
            -- Libérer l'ancien chauffeur s'il était en course
            IF OLD.chauffeur_id IS NOT NULL AND OLD.statut_mission = 'En cours' THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.tb_missions
                    WHERE chauffeur_id = OLD.chauffeur_id
                      AND statut_mission = 'En cours'
                      AND mission_id != OLD.mission_id
                ) THEN
                    UPDATE public.tb_chauffeurs
                    SET disponibilite = 'Disponible'
                    WHERE chauffeur_id = OLD.chauffeur_id;
                END IF;
            END IF;
        END IF;

        -- B. Gestion du statut du (nouveau) chauffeur
        IF NEW.chauffeur_id IS NOT NULL THEN
            -- Si la mission passe ou est 'En cours' -> Indisponible
            IF NEW.statut_mission = 'En cours' THEN
                UPDATE public.tb_chauffeurs
                SET disponibilite = 'Indisponible'
                WHERE chauffeur_id = NEW.chauffeur_id;
                
            -- Si la mission se termine ou s'annule -> Disponible (sauf si autre mission)
            ELSIF NEW.statut_mission IN ('Terminée', 'Annulée') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.tb_missions
                    WHERE chauffeur_id = NEW.chauffeur_id
                      AND statut_mission = 'En cours'
                      AND mission_id != NEW.mission_id
                ) THEN
                    UPDATE public.tb_chauffeurs
                    SET disponibilite = 'Disponible'
                    WHERE chauffeur_id = NEW.chauffeur_id;
                END IF;
            END IF;
        END IF;

    END IF;

    -- Cas 2: Suppression de mission
    IF (TG_OP = 'DELETE') THEN
        IF OLD.chauffeur_id IS NOT NULL AND OLD.statut_mission = 'En cours' THEN
             IF NOT EXISTS (
                SELECT 1 FROM public.tb_missions
                WHERE chauffeur_id = OLD.chauffeur_id
                  AND statut_mission = 'En cours'
                  AND mission_id != OLD.mission_id
            ) THEN
                UPDATE public.tb_chauffeurs
                SET disponibilite = 'Disponible'
                WHERE chauffeur_id = OLD.chauffeur_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_chauffeur_status ON public.tb_missions;

CREATE TRIGGER trigger_sync_chauffeur_status
AFTER INSERT OR UPDATE OR DELETE
ON public.tb_missions
FOR EACH ROW
EXECUTE FUNCTION public.sync_chauffeur_status_on_mission_change();
