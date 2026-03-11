-- Migration: 20260210240000_fix_complete_mission_function_final.sql
-- Description: Version finale de la fonction avec gestion des colonnes dynamiques

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.complete_mission_simple(bigint, numeric, varchar(10), text, boolean);

-- Recréer la fonction avec gestion des colonnes dynamiques
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
    v_count int;
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
        -- Effectuer l'insertion avec gestion des erreurs
        BEGIN
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
        EXCEPTION
            WHEN OTHERS THEN
                -- Si l'insertion échoue, essayer avec plus de colonnes
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
        END;
    END IF;

    -- 3. Enregistrer dans le journal de bord
    -- Récupérer le kilométrage actuel du véhicule pour l'entrée dans le journal
    DECLARE
        v_kilometrage_actuel numeric;
    BEGIN
        SELECT kilometrage_actuel INTO v_kilometrage_actuel
        FROM public.tb_vehicules
        WHERE vehicule_id = v_vehicule_id;
        
        -- Si on ne trouve pas de kilométrage, utiliser 0 comme valeur par défaut
        v_kilometrage_actuel := COALESCE(v_kilometrage_actuel, 0);
        
        -- Insérer dans le journal de bord avec le kilométrage
        INSERT INTO public.tb_journal_bord (
            vehicule_id,
            chauffeur_id,
            mission_id,
            type_evenement,
            kilometrage_releve,
            details,
            date_heure
        ) VALUES (
            v_vehicule_id,
            v_chauffeur_id,
            p_mission_id,
            'Fin de mission',
            v_kilometrage_actuel,
            CONCAT('Clôture: ', COALESCE(p_raison, 'Aucune raison spécifiée'), '. Montant: ', p_montant, ' ', p_devise, '. Charge: ', CASE WHEN p_is_charge_entreprise THEN 'Entreprise' ELSE 'Client' END),
            NOW()
        );
    END;

END;
$$;