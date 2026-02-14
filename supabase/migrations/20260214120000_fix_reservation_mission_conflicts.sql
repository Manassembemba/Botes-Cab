-- Migration : Correction des conflits entre missions et réservations
-- Description : Mettre à jour la fonction de vérification de disponibilité pour inclure les réservations dans la détection de conflits

-- 1. Fonction mise à jour pour vérifier les chevauchements de missions ET réservations
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

-- 2. Recréer le trigger avec la fonction mise à jour
DROP TRIGGER IF EXISTS trigger_check_mission_overlap ON public.tb_missions;

CREATE TRIGGER trigger_check_mission_overlap
    BEFORE INSERT OR UPDATE OF chauffeur_id, vehicule_id, date_depart_prevue, date_arrivee_prevue, statut_mission
    ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_mission_overlap();

-- 3. Mettre à jour la fonction inverse pour les réservations
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    chauffeur_conflict_id INTEGER;
    vehicule_conflict_id INTEGER;
BEGIN
    -- Ignorer si la réservation est annulée ou terminée
    IF NEW.statut_reservation IN ('annulée', 'terminée', 'convertie_en_mission') THEN
        RETURN NEW;
    END IF;

    -- Vérifier chevauchement pour le Chauffeur
    IF NEW.chauffeur_id IS NOT NULL THEN
        -- Vérifier les missions existantes
        SELECT mission_id INTO chauffeur_conflict_id
        FROM public.tb_missions
        WHERE chauffeur_id = NEW.chauffeur_id
          AND statut_mission IN ('Planifiée', 'En cours')
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF chauffeur_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le chauffeur est déjà réservé sur cette période (Conflit avec Mission #%)', chauffeur_conflict_id
            USING ERRCODE = 'P0001';
        END IF;

        -- Vérifier les autres réservations existantes
        SELECT reservation_id INTO chauffeur_conflict_id
        FROM public.tb_reservations
        WHERE chauffeur_id = NEW.chauffeur_id
          AND reservation_id != COALESCE(NEW.reservation_id, -1)
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
          AND (
              (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
          )
        LIMIT 1;

        IF vehicule_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le véhicule est déjà réservé sur cette période (Conflit avec Mission #%)', vehicule_conflict_id
            USING ERRCODE = 'P0001';
        END IF;

        -- Vérifier les autres réservations existantes
        SELECT reservation_id INTO vehicule_conflict_id
        FROM public.tb_reservations
        WHERE vehicule_id = NEW.vehicule_id
          AND reservation_id != COALESCE(NEW.reservation_id, -1)
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

-- 4. Créer le trigger pour les réservations
DROP TRIGGER IF EXISTS trigger_check_reservation_overlap ON public.tb_reservations;

CREATE TRIGGER trigger_check_reservation_overlap
    BEFORE INSERT OR UPDATE OF chauffeur_id, vehicule_id, date_depart_prevue, date_arrivee_prevue, statut_reservation
    ON public.tb_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_reservation_overlap();

-- 5. Mettre à jour la fonction pour obtenir les véhicules disponibles pour inclure les deux tables
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
          -- Vérifier les missions existantes
          SELECT 1
          FROM public.tb_missions m
          WHERE m.vehicule_id = v.vehicule_id
            AND m.statut_mission IN ('Planifiée', 'En cours')
            AND (m.date_depart_prevue, m.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
      AND NOT EXISTS (
          -- Vérifier les réservations existantes
          SELECT 1
          FROM public.tb_reservations r
          WHERE r.vehicule_id = v.vehicule_id
            AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
            AND (r.date_depart_prevue, r.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
    ORDER BY v.marque, v.modele;
$$;

-- 6. Mettre à jour la fonction pour obtenir les chauffeurs disponibles pour inclure les deux tables
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
          -- Vérifier les missions existantes
          SELECT 1
          FROM public.tb_missions m
          WHERE m.chauffeur_id = c.chauffeur_id
            AND m.statut_mission IN ('Planifiée', 'En cours')
            AND (m.date_depart_prevue, m.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
      AND NOT EXISTS (
          -- Vérifier les réservations existantes
          SELECT 1
          FROM public.tb_reservations r
          WHERE r.chauffeur_id = c.chauffeur_id
            AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
            AND (r.date_depart_prevue, r.date_arrivee_prevue) OVERLAPS (start_date, end_date)
      )
    ORDER BY c.nom, c.prenom;
$$;

-- 7. Commentaires pour documentation
COMMENT ON FUNCTION public.check_mission_overlap() IS 'Vérifie les conflits de chevauchement temporel entre missions et réservations pour les ressources (véhicule et chauffeur)';
COMMENT ON FUNCTION public.check_reservation_overlap() IS 'Vérifie les conflits de chevauchement temporel entre réservations et missions pour les ressources (véhicule et chauffeur)';