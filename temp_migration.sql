-- Migration temporaire pour forcer la mise à jour de la fonction de vérification
-- Fonction mise à jour pour vérifier les chevauchements de missions ET réservations
CREATE OR REPLACE FUNCTION public.check_mission_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    chauffeur_conflict_id INTEGER;
    vehicule_conflict_id INTEGER;
    conflict_source TEXT; -- 'mission' ou 'reservation'
BEGIN
    -- Ignorer si la mission est annulée ou terminée
    IF NEW.statut_mission IN ('Terminée', 'Annulée') THEN
        RETURN NEW;
    END IF;

    -- Vérifier chevauchement pour le Chauffeur
    IF NEW.chauffeur_id IS NOT NULL THEN
        -- Vérifier les missions existantes
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

        -- Vérifier les réservations existantes
        SELECT reservation_id INTO chauffeur_conflict_id
        FROM public.tb_reservations
        WHERE chauffeur_id = NEW.chauffeur_id
          AND statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF chauffeur_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le chauffeur est déjà réservé sur cette période (Conflit avec Réservation #%)', chauffeur_conflict_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Vérifier chevauchement pour le Véhicule
    IF NEW.vehicule_id IS NOT NULL THEN
        -- Vérifier les missions existantes
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

        -- Vérifier les réservations existantes
        SELECT reservation_id INTO vehicule_conflict_id
        FROM public.tb_reservations
        WHERE vehicule_id = NEW.vehicule_id
          AND statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF vehicule_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le véhicule est déjà réservé sur cette période (Conflit avec Réservation #%)', vehicule_conflict_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Recréer le trigger avec la fonction mise à jour
DROP TRIGGER IF EXISTS trigger_check_mission_overlap ON public.tb_missions;

CREATE TRIGGER trigger_check_mission_overlap
    BEFORE INSERT OR UPDATE OF chauffeur_id, vehicule_id, date_depart_prevue, date_arrivee_prevue, statut_mission
    ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_mission_overlap();