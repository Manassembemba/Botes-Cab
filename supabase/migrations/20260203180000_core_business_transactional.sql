-- Migration: 20260203180000_core_business_transactional.sql
-- Description: Mise en place de l'architecture "Réservation = Paiement" et des méthodes de paiement configurables.

-- 1. Table des Méthodes de Paiement Configurables
CREATE TABLE IF NOT EXISTS public.tb_payment_methods (
    method_id SERIAL PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertion des méthodes par défaut
INSERT INTO public.tb_payment_methods (label) VALUES
    ('Cash'),
    ('M-Pesa'),
    ('Airtel Money'),
    ('Orange Money'),
    ('Virement Bancaire')
ON CONFLICT (label) DO NOTHING;

-- 2. Mise à jour de la table tb_paiements pour utiliser les méthodes configurables (sans contrainte forte pour l'historique, mais recommandé)
-- On garde la colonne 'methode_paiement' text pour l'instant pour la compatibilité, mais on pourrait migrer plus tard.

-- 3. Procédure RPC Atomique : Création Mission + Paiement Initial
CREATE OR REPLACE FUNCTION public.create_mission_with_transaction(
    mission_data JSONB,
    payment_amount DECIMAL,
    payment_method_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
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
        client_nom,
        lieu_depart,
        lieu_arrivee,
        date_depart_prevue,
        date_arrivee_prevue,
        statut_mission,
        montant_total,
        acompte, -- Sera recalculé/validé par le paiement
        solde,   -- Sera recalculé
        devise,
        type_course
    ) VALUES (
        (mission_data->>'chauffeur_id')::INTEGER,
        (mission_data->>'vehicule_id')::INTEGER,
        mission_data->>'client_nom',
        mission_data->>'lieu_depart',
        mission_data->>'lieu_arrivee',
        (mission_data->>'date_depart_prevue')::TIMESTAMP,
        (mission_data->>'date_arrivee_prevue')::TIMESTAMP,
        COALESCE(mission_data->>'statut_mission', 'Planifiée'),
        (mission_data->>'montant_total')::DECIMAL,
        payment_amount, -- L'acompte initial est ce qu'on paie maintenant
        ((mission_data->>'montant_total')::DECIMAL - payment_amount), -- Le solde initial
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

-- 4. Procédure RPC pour ajouter un paiement ultérieur (Solde)
CREATE OR REPLACE FUNCTION public.add_mission_payment(
    p_mission_id INTEGER,
    p_amount DECIMAL,
    p_method_id INTEGER,
    p_date TIMESTAMP DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_solde DECIMAL;
    payment_method_label TEXT;
    new_payment_record RECORD;
BEGIN
    -- Vérifications
    SELECT solde INTO current_solde FROM public.tb_missions WHERE mission_id = p_mission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mission introuvable';
    END IF;

    IF p_amount <= 0 THEN
         RAISE EXCEPTION 'Le montant doit être positif';
    END IF;

    SELECT label INTO payment_method_label FROM public.tb_payment_methods WHERE method_id = p_method_id;
    IF payment_method_label IS NULL THEN
        RAISE EXCEPTION 'Méthode de paiement invalide';
    END IF;

    -- Insertion Paiement
    INSERT INTO public.tb_paiements (
        mission_id,
        montant,
        devise,
        methode_paiement,
        date_paiement,
        notes
    ) VALUES (
        p_mission_id,
        p_amount,
        (SELECT devise FROM public.tb_missions WHERE mission_id = p_mission_id),
        payment_method_label,
        p_date,
        'Régularisation / Solde'
    ) RETURNING * INTO new_payment_record;

    -- Le trigger update_mission_solde_on_payment mettra à jour le solde de la mission
    -- Le trigger auto_create_caisse_on_paiement mettra à jour la caisse

    RETURN to_jsonb(new_payment_record);
END;
$$;
