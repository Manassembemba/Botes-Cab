-- Migration: 20260210270000_update_mission_creation_function.sql
-- Description: Mise à jour de la fonction RPC pour inclure le client_id dans la création de mission

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.create_mission_with_transaction(jsonb, decimal, integer);

-- Recréer la fonction avec le support du client_id
CREATE OR REPLACE FUNCTION public.create_mission_with_transaction(
    mission_data JSONB,
    payment_amount DECIMAL,
    payment_method_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_mission_id INTEGER;
    payment_method_label TEXT;
    mission_record RECORD;
BEGIN
    -- Validation du paiement si montant > 0
    IF payment_amount > 0 THEN
        IF payment_method_id IS NULL THEN
            RAISE EXCEPTION 'Une méthode de paiement est requise pour un montant > 0';
        END IF;

        SELECT label INTO payment_method_label FROM public.tb_payment_methods WHERE method_id = payment_method_id;
        IF payment_method_label IS NULL THEN
            RAISE EXCEPTION 'Méthode de paiement invalide';
        END IF;
    END IF;

    -- 1. Insertion de la Mission
    INSERT INTO public.tb_missions (
        chauffeur_id,
        vehicule_id,
        client_id,  -- Ajout du client_id
        client_nom,
        lieu_depart,
        lieu_arrivee,
        date_depart_prevue,
        date_arrivee_prevue,
        statut_mission,
        montant_total,
        acompte,
        solde,
        devise,
        type_course
    ) VALUES (
        (mission_data->>'chauffeur_id')::INTEGER,
        (mission_data->>'vehicule_id')::INTEGER,
        (mission_data->>'client_id')::INTEGER,  -- Ajout du client_id
        mission_data->>'client_nom',
        mission_data->>'lieu_depart',
        mission_data->>'lieu_arrivee',
        (mission_data->>'date_depart_prevue')::TIMESTAMP,
        (mission_data->>'date_arrivee_prevue')::TIMESTAMP,
        COALESCE(mission_data->>'statut_mission', 'Planifiée'),
        (mission_data->>'montant_total')::DECIMAL,
        payment_amount,
        ((mission_data->>'montant_total')::DECIMAL - payment_amount),
        COALESCE(mission_data->>'devise', 'USD'),
        mission_data->>'type_course'
    )
    RETURNING mission_id INTO new_mission_id;

    -- 2. Insertion du Paiement (si applicable)
    IF payment_amount > 0 THEN
        INSERT INTO public.tb_paiements (
            mission_id,
            montant,
            devise,
            methode_paiement,
            date_paiement,
            notes
        ) VALUES (
            new_mission_id,
            payment_amount,
            COALESCE(mission_data->>'devise', 'USD'),
            payment_method_label,
            NOW(),
            'Paiement initial à la réservation'
        );
        -- Note: Le trigger auto_create_caisse_on_paiement s'occupera de la compta tb_caisse
    END IF;

    -- Récupérer la mission créée pour le retour
    SELECT * INTO mission_record FROM public.tb_missions WHERE mission_id = new_mission_id;

    RETURN to_jsonb(mission_record);

EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, tout est annulé grâce à la transaction implicite de la fonction PostgreSQL
    RAISE;
END;
$$;