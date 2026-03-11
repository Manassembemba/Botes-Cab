-- Migration: 20260210350000_add_occupation_badge.sql
-- Description: Ajout d'un système de badges pour indiquer l'état d'occupation des véhicules

-- Ajouter une colonne pour l'état d'occupation dans la table des véhicules
ALTER TABLE public.tb_vehicules 
ADD COLUMN IF NOT EXISTS etat_occupation VARCHAR(20) DEFAULT 'disponible' CHECK (etat_occupation IN ('disponible', 'occupe', 'maintenance', 'hors_service'));

-- Fonction pour mettre à jour l'état d'occupation d'un véhicule
CREATE OR REPLACE FUNCTION public.update_vehicule_occupation_status(vehicule_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    current_mission_exists BOOLEAN;
    reservation_exists BOOLEAN;
BEGIN
    -- Vérifier s'il y a une mission en cours pour ce véhicule
    SELECT EXISTS(
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.vehicule_id = vehicule_id_param 
        AND m.statut_mission = 'En cours'
    ) INTO current_mission_exists;

    -- Vérifier s'il y a une réservation active pour ce véhicule
    SELECT EXISTS(
        SELECT 1 
        FROM public.tb_reservations r
        WHERE r.vehicule_id = vehicule_id_param 
        AND r.statut_reservation = 'en_cours'
    ) INTO reservation_exists;

    -- Mettre à jour l'état d'occupation
    UPDATE public.tb_vehicules
    SET etat_occupation = CASE
        WHEN current_mission_exists OR reservation_exists THEN 'occupe'
        WHEN statut = 'En maintenance' THEN 'maintenance'
        WHEN statut = 'Hors service' THEN 'hors_service'
        ELSE 'disponible'
    END
    WHERE vehicule_id = vehicule_id_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un véhicule est occupé dans une plage horaire spécifique
CREATE OR REPLACE FUNCTION public.is_vehicule_occupe_in_range(
    vehicule_id_param INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
    is_occupe BOOLEAN;
BEGIN
    -- Vérifier si le véhicule a une mission active dans cette plage
    SELECT EXISTS(
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.vehicule_id = vehicule_id_param
        AND m.statut_mission NOT IN ('Terminée', 'Annulée')
        AND (
            (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
            OR 
            (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
        )
    ) OR EXISTS(
        -- Vérifier si le véhicule a une réservation active dans cette plage
        SELECT 1 
        FROM public.tb_reservations r
        WHERE r.vehicule_id = vehicule_id_param
        AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
        AND (
            (r.date_depart_prevue < end_date AND r.date_arrivee_prevue > start_date)
            OR 
            (start_date < r.date_arrivee_prevue AND end_date > r.date_depart_prevue)
        )
    ) INTO is_occupe;

    RETURN is_occupe;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les détails des occupations d'un véhicule dans une plage horaire
CREATE OR REPLACE FUNCTION public.get_vehicule_occupations_in_range(
    vehicule_id_param INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    type_reservation VARCHAR(20),
    client TEXT,
    dates_plage TEXT,
    statut VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    -- Récupérer les missions dans la plage
    SELECT 
        'mission'::VARCHAR AS type_reservation,
        COALESCE(c.nom, m.client_nom, 'Client inconnu') AS client,
        CONCAT(TO_CHAR(m.date_depart_prevue, 'DD/MM HH24:MI'), ' - ', TO_CHAR(m.date_arrivee_prevue, 'DD/MM HH24:MI')) AS dates_plage,
        m.statut_mission AS statut
    FROM public.tb_missions m
    LEFT JOIN public.tb_clients c ON m.client_id = c.client_id
    WHERE m.vehicule_id = vehicule_id_param
    AND m.statut_mission NOT IN ('Terminée', 'Annulée')
    AND (
        (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
        OR 
        (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
    )
    
    UNION ALL
    
    -- Récupérer les réservations dans la plage
    SELECT 
        'reservation'::VARCHAR AS type_reservation,
        COALESCE(c.nom, r.client_nom, 'Client inconnu') AS client,
        CONCAT(TO_CHAR(r.date_depart_prevue, 'DD/MM HH24:MI'), ' - ', TO_CHAR(r.date_arrivee_prevue, 'DD/MM HH24:MI')) AS dates_plage,
        r.statut_reservation AS statut
    FROM public.tb_reservations r
    LEFT JOIN public.tb_clients c ON r.client_id = c.client_id
    WHERE r.vehicule_id = vehicule_id_param
    AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
    AND (
        (r.date_depart_prevue < end_date AND r.date_arrivee_prevue > start_date)
        OR 
        (start_date < r.date_arrivee_prevue AND end_date > r.date_depart_prevue)
    );
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour automatiquement l'état d'occupation
-- Pour les missions
CREATE OR REPLACE FUNCTION public.update_vehicule_status_on_mission_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour l'état d'occupation du véhicule concerné
    PERFORM public.update_vehicule_occupation_status(COALESCE(NEW.vehicule_id, OLD.vehicule_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_vehicule_status_on_reservation_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour l'état d'occupation du véhicule concerné
    PERFORM public.update_vehicule_occupation_status(COALESCE(NEW.vehicule_id, OLD.vehicule_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS update_vehicule_occupation_on_mission_change ON public.tb_missions;
CREATE TRIGGER update_vehicule_occupation_on_mission_change
    AFTER INSERT OR UPDATE OF statut_mission, date_depart_prevue, date_arrivee_prevue ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicule_status_on_mission_change();

DROP TRIGGER IF EXISTS update_vehicule_occupation_on_reservation_change ON public.tb_reservations;
CREATE TRIGGER update_vehicule_occupation_on_reservation_change
    AFTER INSERT OR UPDATE OF statut_reservation, date_depart_prevue, date_arrivee_prevue ON public.tb_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicule_status_on_reservation_change();

-- Mettre à jour les états d'occupation pour tous les véhicules existants
UPDATE public.tb_vehicules
SET etat_occupation = 'disponible';

-- Mettre à jour les états en fonction des missions actuelles
WITH vehicules_occupes AS (
    SELECT DISTINCT vehicule_id
    FROM public.tb_missions
    WHERE statut_mission = 'En cours'
)
UPDATE public.tb_vehicules
SET etat_occupation = 'occupe'
WHERE vehicule_id IN (SELECT vehicule_id FROM vehicules_occupes);

-- Mettre à jour les états en fonction des réservations actuelles
WITH vehicules_occupes AS (
    SELECT DISTINCT vehicule_id
    FROM public.tb_reservations
    WHERE statut_reservation = 'en_cours'
)
UPDATE public.tb_vehicules
SET etat_occupation = 'occupe'
WHERE vehicule_id IN (SELECT vehicule_id FROM vehicules_occupes);