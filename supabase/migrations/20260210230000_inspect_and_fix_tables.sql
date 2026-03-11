-- Migration: 20260210230000_inspect_and_fix_tables.sql
-- Description: Inspection des tables et correction de la fonction

-- Afficher la structure complète des tables pour identifier les colonnes problématiques

-- Table tb_depenses
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_depenses' 
ORDER BY ordinal_position;

-- Table tb_journal_bord
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_journal_bord' 
ORDER BY ordinal_position;

-- Table tb_missions
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' AND column_default IS NULL 
        THEN 'REQUISE SANS VALEUR PAR DEFAUT' 
        ELSE 'OK' 
    END AS statut
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tb_missions' 
ORDER BY ordinal_position;

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.complete_mission_simple(bigint, numeric, varchar(10), text, boolean);

-- Recréer la fonction avec gestion complète des colonnes requises
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
            date_depense
        ) VALUES (
            v_vehicule_id,
            v_chauffeur_id,
            p_mission_id,
            COALESCE(NULLIF(TRIM(p_raison), ''), 'Course'),
            p_montant,
            p_devise,
            CONCAT('Dépense course #', p_mission_id, ': ', COALESCE(p_raison, 'Aucune raison spécifiée')),
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