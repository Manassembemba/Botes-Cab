-- Migration: 20260210110000_drop_conflicting_function_versions.sql
-- Description: Suppression explicite des versions conflictuelles de la fonction complete_mission_with_fuel

-- Supprimer la version avec l'ordre incorrect des paramètres
-- Signature: complete_mission_with_fuel(bigint, integer, numeric, text, numeric, varchar)
-- Paramètres dans l'ordre: p_mission_id, p_km_final, p_carburant_litres, p_notes, p_carburant_montant, p_carburant_devise
-- ATTENTION: p_km_final est défini comme integer dans cette ancienne version
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, text, numeric, varchar);

-- Supprimer l'autre version avec l'ordre incorrect des paramètres
-- Signature: complete_mission_with_fuel(bigint, integer, numeric, numeric, varchar, text)
-- Paramètres dans l'ordre: p_mission_id, p_km_final, p_carburant_montant, p_carburant_devise, p_carburant_litres, p_notes
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, integer, numeric, numeric, varchar, text);

-- Supprimer une autre version avec l'ordre incorrect des paramètres
-- Signature: complete_mission_with_fuel(bigint, numeric, integer, numeric, varchar, text)
-- Paramètres dans l'ordre: p_mission_id, p_km_final, p_carburant_litres, p_carburant_montant, p_carburant_devise, p_notes
-- ATTENTION: p_km_final est défini comme numeric mais p_carburant_litres comme integer dans cette ancienne version
DROP FUNCTION IF EXISTS public.complete_mission_with_fuel(bigint, numeric, integer, numeric, varchar, text);

-- Confirmer que la bonne version est la seule restante
-- La bonne signature est: complete_mission_with_fuel(bigint, numeric, numeric, text, numeric, varchar(10))
-- Paramètres dans l'ordre: p_mission_id, p_km_final, p_carburant_litres, p_notes, p_carburant_montant, p_carburant_devise
-- p_km_final est de type numeric
-- p_carburant_litres est de type numeric
-- p_notes est de type text
-- p_carburant_montant est de type numeric(12,2)
-- p_carburant_devise est de type varchar(10)

-- Si la bonne version n'existe pas encore, la recréer
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
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'complete_mission_with_fuel';
    
    IF func_count != 1 THEN
        RAISE WARNING 'ATTENTION: Il y a % versions de la fonction complete_mission_with_fuel. Il devrait n''y en avoir qu''une.', func_count;
    ELSE
        RAISE NOTICE 'Fonction complete_mission_with_fuel correctement configurée avec une seule version.';
    END IF;
END $$;