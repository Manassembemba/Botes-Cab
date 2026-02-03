-- Migration: 20260203193000_update_payment_rpc_notes.sql
-- Description: Mise à jour de la RPC add_mission_payment pour accepter des notes personnalisées.

CREATE OR REPLACE FUNCTION public.add_mission_payment(
    p_mission_id INTEGER,
    p_amount DECIMAL,
    p_method_id INTEGER,
    p_date TIMESTAMP DEFAULT NOW(),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_solde DECIMAL;
    payment_method_label TEXT;
    new_payment_record RECORD;
    final_notes TEXT;
BEGIN
    -- Vérifications
    SELECT solde INTO current_solde FROM public.tb_missions WHERE mission_id = p_mission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mission introuvable';
    END IF;

    IF p_amount <= 0 THEN
         RAISE EXCEPTION 'Le montant doit être positif';
    END IF;
    
    -- On autorise le paiement supérieur au solde ? Pour l'instant oui, ça fera un solde négatif (trop perçu).

    SELECT label INTO payment_method_label FROM public.tb_payment_methods WHERE method_id = p_method_id;
    IF payment_method_label IS NULL THEN
        RAISE EXCEPTION 'Méthode de paiement invalide';
    END IF;

    -- Gestion de la note par défaut si null
    final_notes := COALESCE(p_notes, 'Régularisation / Solde');

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
        (SELECT devise FROM public.tb_missions WHERE mission_id = p_mission_id), -- On garde la devise de la mission
        payment_method_label,
        p_date,
        final_notes
    ) RETURNING * INTO new_payment_record;

    -- Trigger auto update solde & caisse se déclencheront
    
    RETURN to_jsonb(new_payment_record);
END;
$$;
