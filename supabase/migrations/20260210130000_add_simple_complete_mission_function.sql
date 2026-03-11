-- Migration: 20260210130000_add_simple_complete_mission_function.sql
-- Description: Ajout d'une nouvelle fonction simplifiée pour la clôture de mission

-- Création de la nouvelle fonction simplifiée pour la clôture de mission
CREATE OR REPLACE FUNCTION public.complete_mission_simple(
    p_mission_id bigint,
    p_montant numeric,
    p_devise varchar(10),
    p_raison text,
    p_is_charge_entreprise boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vehicule_id int;
    v_chauffeur_id int;
    v_client_id int;
BEGIN
    -- Récupérer les infos de la mission
    SELECT vehicule_id, chauffeur_id, client_id INTO v_vehicule_id, v_chauffeur_id, v_client_id
    FROM public.tb_missions
    WHERE mission_id = p_mission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mission #% non trouvée', p_mission_id;
    END IF;

    -- 1. Mettre à jour la mission
    UPDATE public.tb_missions
    SET statut_mission = 'Terminée',
        date_arrivee_reelle = NOW(),
        updated_at = NOW()
    WHERE mission_id = p_mission_id;

    -- 2. Enregistrer la dépense si montant > 0 et si c'est à la charge de l'entreprise
    IF p_montant > 0 AND p_is_charge_entreprise THEN
        INSERT INTO public.tb_depenses (
            vehicule_id,
            chauffeur_id,
            mission_id,
            categorie,
            montant,
            devise,
            description,
            date_depense
        ) VALUES (
            v_vehicule_id,
            v_chauffeur_id,
            p_mission_id,
            'Course',
            p_montant,
            p_devise,
            CONCAT('Dépense course #', p_mission_id, ': ', COALESCE(p_raison, 'Aucune raison spécifiée')),
            NOW()
        );
        -- Le trigger trigger_auto_caisse_depense créera automatiquement la sortie de caisse
    END IF;

    -- 3. Enregistrer dans le journal de bord (Technique)
    INSERT INTO public.tb_journal_bord (
        vehicule_id,
        chauffeur_id,
        mission_id,
        type_evenement,
        details,
        date_heure
    ) VALUES (
        v_vehicule_id,
        v_chauffeur_id,
        p_mission_id,
        'Fin de mission',
        CONCAT('Clôture: ', COALESCE(p_raison, 'Aucune raison spécifiée'), '. Montant: ', p_montant, ' ', p_devise, '. Charge: ', CASE WHEN p_is_charge_entreprise THEN 'Entreprise' ELSE 'Client' END),
        NOW()
    );

END;
$$;