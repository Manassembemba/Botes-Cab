-- Migration: 20260210210000_final_complete_mission_function.sql
-- Description: Version finale avec tous les champs possibles

-- Supprimer toutes les anciennes versions
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, text, numeric, varchar);
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, varchar, numeric, text);
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, numeric, integer, numeric, varchar, text);
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, numeric, numeric, text, numeric, varchar(10));
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, numeric, numeric, text, numeric, varchar);
DROP FUNCTION IF EXISTS public.complete_mission_simple(bigint, numeric, varchar(10), text, boolean);

-- Créer la fonction finale
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
    v_mission_exists boolean;
BEGIN
    -- Vérifier si la mission existe
    SELECT EXISTS(SELECT 1 FROM public.tb_missions WHERE mission_id = p_mission_id) INTO v_mission_exists;
    
    IF NOT v_mission_exists THEN
        RAISE EXCEPTION 'Mission #% non trouvée', p_mission_id;
    END IF;

    -- Récupérer les infos de la mission
    SELECT vehicule_id, chauffeur_id INTO v_vehicule_id, v_chauffeur_id
    FROM public.tb_missions
    WHERE mission_id = p_mission_id;

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
            date_depense,
            created_at,
            updated_at
        ) VALUES (
            v_vehicule_id,
            v_chauffeur_id,
            p_mission_id,
            COALESCE(NULLIF(TRIM(p_raison), ''), 'Course'),
            p_montant,
            p_devise,
            CONCAT('Dépense course #', p_mission_id, ': ', COALESCE(p_raison, 'Aucune raison spécifiée')),
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    -- 3. Enregistrer dans le journal de bord
    INSERT INTO public.tb_journal_bord (
        vehicule_id,
        chauffeur_id,
        mission_id,
        type_evenement,
        details,
        date_heure,
        created_at,
        updated_at
    ) VALUES (
        v_vehicule_id,
        v_chauffeur_id,
        p_mission_id,
        'Fin de mission',
        CONCAT('Clôture: ', COALESCE(p_raison, 'Aucune raison spécifiée'), '. Montant: ', p_montant, ' ', p_devise, '. Charge: ', CASE WHEN p_is_charge_entreprise THEN 'Entreprise' ELSE 'Client' END),
        NOW(),
        NOW(),
        NOW()
    );

END;
$$;