-- Migration : Fix Mission Conflicts (Time Overlap)
-- Description : Remplace la vérification stricte par une vérification de chevauchement temporel (OVERLAPS)

CREATE OR REPLACE FUNCTION public.check_resource_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    chauffeur_busy BOOLEAN;
    vehicule_busy BOOLEAN;
    existing_mission_id INTEGER;
    existing_mission_start TIMESTAMP;
    existing_mission_end TIMESTAMP;
BEGIN
    -- 1. Vérifier disponibilité CHAUFFEUR
    SELECT mission_id, date_depart_prevue, date_arrivee_prevue
    INTO existing_mission_id, existing_mission_start, existing_mission_end
    FROM public.tb_missions 
    WHERE chauffeur_id = NEW.chauffeur_id 
      AND statut_mission IN ('Planifiée', 'En cours')
      AND mission_id != COALESCE(NEW.mission_id, -1)
      -- Vérification de chevauchement temporel : (StartA, EndA) OVERLAPS (StartB, EndB)
      AND (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
    LIMIT 1;

    IF existing_mission_id IS NOT NULL THEN
        RAISE EXCEPTION 'Le chauffeur est déjà pris sur ce créneau (Mission #% : % - %).', 
            existing_mission_id, 
            to_char(existing_mission_start, 'DD/MM HH24:MI'), 
            to_char(existing_mission_end, 'HH24:MI')
        USING ERRCODE = 'P0001';
    END IF;

    -- 2. Vérifier disponibilité VÉHICULE
    SELECT mission_id, date_depart_prevue, date_arrivee_prevue
    INTO existing_mission_id, existing_mission_start, existing_mission_end
    FROM public.tb_missions 
    WHERE vehicule_id = NEW.vehicule_id 
      AND statut_mission IN ('Planifiée', 'En cours')
      AND mission_id != COALESCE(NEW.mission_id, -1)
      AND (date_depart_prevue, date_arrivee_prevue) OVERLAPS (NEW.date_depart_prevue, NEW.date_arrivee_prevue)
    LIMIT 1;

    IF existing_mission_id IS NOT NULL THEN
        RAISE EXCEPTION 'Le véhicule est déjà pris sur ce créneau (Mission #% : % - %).', 
            existing_mission_id, 
            to_char(existing_mission_start, 'DD/MM HH24:MI'), 
            to_char(existing_mission_end, 'HH24:MI')
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;
