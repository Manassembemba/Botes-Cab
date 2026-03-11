-- Migration: 20260210120000_inspect_and_fix_functions.sql
-- Description: Inspecter les fonctions existantes et supprimer celles qui causent le conflit

-- Afficher toutes les versions de la fonction pour identifier les signatures exactes
DO $$
DECLARE
    func_record RECORD;
    func_list TEXT := '';
BEGIN
    FOR func_record IN
        SELECT p.oid, proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'complete_mission_with_fuel'
    LOOP
        func_list := func_list || format(E'\n- Function OID %s: complete_mission_with_fuel(%s)', func_record.oid, func_record.args);
    END LOOP;
    
    RAISE NOTICE 'Versions actuelles de la fonction complete_mission_with_fuel:%', func_list;
END $$;

-- Supprimer les fonctions spécifiques qui causent le conflit en se basant sur les types de données
-- Selon l'erreur originale, les deux signatures en conflit sont :
-- 1. complete_mission_with_fuel(p_mission_id => bigint, p_km_final => integer, p_carburant_montant => numeric, p_carburant_devise => character varying, p_carburant_litres => numeric, p_notes => text)
-- 2. complete_mission_with_fuel(p_mission_id => bigint, p_km_final => numeric, p_carburant_litres => numeric, p_notes => text, p_carburant_montant => numeric, p_carburant_devise => character varying)

-- Supprimer la première version problématique (p_km_final en tant qu'integer)
-- Cette version a probablement les paramètres dans l'ordre : bigint, integer, numeric, varchar, numeric, text
-- ou dans l'ordre : bigint, integer, numeric, text, numeric, varchar
-- Essayons les deux ordres possibles
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, varchar, numeric, text);
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, text, numeric, varchar);

-- Supprimer la deuxième version problématique (p_km_final en tant que numeric)
-- Cette version a les paramètres dans l'ordre : bigint, numeric, numeric, text, numeric, varchar
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, numeric, numeric, text, numeric, varchar);

-- Recréer la fonction avec la signature correcte
CREATE OR REPLACE FUNCTION public.complete_mission_with_fuel(
    p_mission_id bigint,
    p_km_final numeric,
    p_carburant_litres numeric,
    p_notes text,
    p_carburant_montant numeric(12,2),
    p_carburant_devise varchar(10)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vehicule_id int;
    v_chauffeur_id int;
BEGIN
    -- Récupérer les infos de la mission
    SELECT vehicule_id, chauffeur_id INTO v_vehicule_id, v_chauffeur_id
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

    -- 2. Mettre à jour le kilométrage du véhicule
    UPDATE public.tb_vehicules
    SET kilometrage_actuel = p_km_final,
        updated_at = NOW()
    WHERE vehicule_id = v_vehicule_id;

    -- 3. Enregistrer dans le journal de bord (Technique)
    INSERT INTO public.tb_journal_bord (
        vehicule_id,
        chauffeur_id,
        mission_id,
        type_evenement,
        kilometrage_releve,
        litres_carburant,
        details,
        date_heure
    ) VALUES (
        v_vehicule_id,
        v_chauffeur_id,
        p_mission_id,
        'Fin de mission',
        p_km_final,
        p_carburant_litres,
        p_notes,
        NOW()
    );

    -- 4. Enregistrer la dépense si montant > 0 (Financier)
    IF p_carburant_montant > 0 THEN
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
            'Carburant',
            p_carburant_montant,
            p_carburant_devise,
            CONCAT('Carburant course #', p_mission_id, CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END),
            NOW()
        );
        -- Le trigger trigger_auto_caisse_depense créera automatiquement la sortie de caisse
    END IF;

END;
$$;

-- Vérifier qu'il n'y ait qu'une seule version de la fonction
DO $$
DECLARE
    func_count INTEGER;
    func_record RECORD;  -- Déclaration de la variable record
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'complete_mission_with_fuel';
    
    IF func_count != 1 THEN
        RAISE WARNING 'ATTENTION: Il y a % versions de la fonction complete_mission_with_fuel. Il devrait n''y en avoir qu''une.', func_count;
        
        -- Afficher les détails des fonctions restantes pour débogage
        FOR func_record IN
            SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'complete_mission_with_fuel'
        LOOP
            RAISE WARNING 'Fonction existante: complete_mission_with_fuel(%s)', func_record.args;
        END LOOP;
    ELSE
        RAISE NOTICE 'Fonction complete_mission_with_fuel correctement configurée avec une seule version.';
    END IF;
END $$;