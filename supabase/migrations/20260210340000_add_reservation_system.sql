-- Migration: 20260210340000_add_reservation_system.sql
-- Description: Ajout d'un système de réservations multiples pour permettre les chevauchements planifiés

-- Création d'une table pour gérer les réservations multiples
CREATE TABLE IF NOT EXISTS public.tb_reservations (
    reservation_id SERIAL PRIMARY KEY,
    vehicule_id INTEGER NOT NULL REFERENCES public.tb_vehicules(vehicule_id) ON DELETE CASCADE,
    chauffeur_id INTEGER REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES public.tb_clients(client_id) ON DELETE SET NULL,
    client_nom TEXT, -- Pour les clients occasionnels sans compte
    lieu_depart TEXT NOT NULL,
    lieu_arrivee TEXT NOT NULL,
    date_depart_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
    date_arrivee_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
    date_depart_reelle TIMESTAMP WITH TIME ZONE,
    date_arrivee_reelle TIMESTAMP WITH TIME ZONE,
    statut_reservation VARCHAR(50) NOT NULL DEFAULT 'confirmée' CHECK (statut_reservation IN ('brouillon', 'confirmée', 'en_cours', 'terminée', 'annulée')),
    type_course TEXT,
    montant_total NUMERIC(12,2),
    acompte NUMERIC(12,2) DEFAULT 0,
    solde NUMERIC(12,2),
    devise VARCHAR(10) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création des indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_reservations_vehicule ON public.tb_reservations(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_reservations_chauffeur ON public.tb_reservations(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client ON public.tb_reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.tb_reservations(date_depart_prevue, date_arrivee_prevue);
CREATE INDEX IF NOT EXISTS idx_reservations_statut ON public.tb_reservations(statut_reservation);

-- Création du trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tb_reservations_updated_at 
    BEFORE UPDATE ON public.tb_reservations 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Fonction pour vérifier la disponibilité d'un véhicule dans une plage horaire
CREATE OR REPLACE FUNCTION public.check_vehicule_disponibilite(
    p_vehicule_id INTEGER,
    p_date_debut TIMESTAMP WITH TIME ZONE,
    p_date_fin TIMESTAMP WITH TIME ZONE,
    p_reservation_id INTEGER DEFAULT NULL -- Pour exclure une réservation spécifique (cas de modification)
)
RETURNS TABLE(
    disponible BOOLEAN,
    conflits JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        NOT EXISTS (
            SELECT 1 
            FROM public.tb_reservations r
            WHERE r.vehicule_id = p_vehicule_id
            AND r.reservation_id != COALESCE(p_reservation_id, -1)  -- Exclure la réservation en cours de modification
            AND r.statut_reservation NOT IN ('annulée', 'terminée')  -- Ne pas considérer les réservations terminées ou annulées
            AND (
                (r.date_depart_prevue < p_date_fin AND r.date_arrivee_prevue > p_date_debut)
                OR 
                (p_date_debut < r.date_arrivee_prevue AND p_date_fin > r.date_depart_prevue)
            )
        ) AS disponible,
        COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'reservation_id', r.reservation_id,
                    'client', r.client_nom,
                    'dates', CONCAT(r.date_depart_prevue, ' - ', r.date_arrivee_prevue),
                    'statut', r.statut_reservation
                )
            )
            FROM public.tb_reservations r
            WHERE r.vehicule_id = p_vehicule_id
            AND r.reservation_id != COALESCE(p_reservation_id, -1)
            AND r.statut_reservation NOT IN ('annulée', 'terminée')
            AND (
                (r.date_depart_prevue < p_date_fin AND r.date_arrivee_prevue > p_date_debut)
                OR 
                (p_date_debut < r.date_arrivee_prevue AND p_date_fin > r.date_depart_prevue)
            )
        ), '[]'::JSONB) AS conflits;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour convertir une réservation en mission principale
CREATE OR REPLACE FUNCTION public.convert_reservation_to_mission(
    p_reservation_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_reservation RECORD;
    v_new_mission_id INTEGER;
BEGIN
    -- Récupérer les détails de la réservation
    SELECT * INTO v_reservation
    FROM public.tb_reservations
    WHERE reservation_id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Réservation #% introuvable', p_reservation_id;
    END IF;
    
    -- Insérer dans la table des missions
    INSERT INTO public.tb_missions (
        chauffeur_id,
        vehicule_id,
        client_id,
        client_nom,
        lieu_depart,
        lieu_arrivee,
        date_depart_prevue,
        date_arrivee_prevue,
        date_depart_reelle,
        date_arrivee_reelle,
        statut_mission,
        type_course,
        montant_total,
        acompte,
        solde,
        devise,
        notes
    ) VALUES (
        v_reservation.chauffeur_id,
        v_reservation.vehicule_id,
        v_reservation.client_id,
        v_reservation.client_nom,
        v_reservation.lieu_depart,
        v_reservation.lieu_arrivee,
        v_reservation.date_depart_prevue,
        v_reservation.date_arrivee_prevue,
        v_reservation.date_depart_reelle,
        v_reservation.date_arrivee_reelle,
        CASE 
            WHEN v_reservation.statut_reservation = 'en_cours' THEN 'En cours'
            WHEN v_reservation.statut_reservation = 'terminée' THEN 'Terminée'
            WHEN v_reservation.statut_reservation = 'annulée' THEN 'Annulée'
            ELSE 'Planifiée'
        END,
        v_reservation.type_course,
        v_reservation.montant_total,
        v_reservation.acompte,
        v_reservation.solde,
        v_reservation.devise,
        v_reservation.notes
    )
    RETURNING mission_id INTO v_new_mission_id;
    
    -- Mettre à jour la réservation pour indiquer qu'elle a été convertie
    UPDATE public.tb_reservations
    SET statut_reservation = 'convertie_en_mission'
    WHERE reservation_id = p_reservation_id;
    
    RETURN v_new_mission_id;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la fonction de vérification de disponibilité pour inclure les réservations
CREATE OR REPLACE FUNCTION public.get_available_vehicules_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_vehicules AS $$
BEGIN
    RETURN QUERY
    SELECT v.*
    FROM public.tb_vehicules v
    WHERE NOT EXISTS (
        -- Vérifier les missions existantes
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.vehicule_id = v.vehicule_id
        AND m.statut_mission NOT IN ('Terminée', 'Annulée')
        AND (
            (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
            OR 
            (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
        )
    )
    AND NOT EXISTS (
        -- Vérifier les réservations existantes
        SELECT 1 
        FROM public.tb_reservations r
        WHERE r.vehicule_id = v.vehicule_id
        AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
        AND (
            (r.date_depart_prevue < end_date AND r.date_arrivee_prevue > start_date)
            OR 
            (start_date < r.date_arrivee_prevue AND end_date > r.date_depart_prevue)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la fonction de vérification de disponibilité des chauffeurs pour inclure les réservations
CREATE OR REPLACE FUNCTION public.get_available_chauffeurs_in_range(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.tb_chauffeurs AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.tb_chauffeurs c
    WHERE NOT EXISTS (
        -- Vérifier les missions existantes
        SELECT 1 
        FROM public.tb_missions m
        WHERE m.chauffeur_id = c.chauffeur_id
        AND m.statut_mission NOT IN ('Terminée', 'Annulée')
        AND (
            (m.date_depart_prevue < end_date AND m.date_arrivee_prevue > start_date)
            OR 
            (start_date < m.date_arrivee_prevue AND end_date > m.date_depart_prevue)
        )
    )
    AND NOT EXISTS (
        -- Vérifier les réservations existantes
        SELECT 1 
        FROM public.tb_reservations r
        WHERE r.chauffeur_id = c.chauffeur_id
        AND r.statut_reservation NOT IN ('annulée', 'terminée', 'convertie_en_mission')
        AND (
            (r.date_depart_prevue < end_date AND r.date_arrivee_prevue > start_date)
            OR 
            (start_date < r.date_arrivee_prevue AND end_date > r.date_depart_prevue)
        )
    );
END;
$$ LANGUAGE plpgsql;