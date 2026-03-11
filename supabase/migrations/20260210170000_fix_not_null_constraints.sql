-- Migration: 20260210170000_fix_not_null_constraints.sql
-- Description: Correction de la fonction complete_mission_simple pour respecter les contraintes NOT NULL

-- Mise à jour de la fonction pour s'assurer que toutes les colonnes obligatoires sont fournies
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
    -- Log de début
    RAISE LOG 'Début de complete_mission_simple - mission_id: %', p_mission_id;

    -- Vérifier si la mission existe
    SELECT EXISTS(SELECT 1 FROM public.tb_missions WHERE mission_id = p_mission_id) INTO v_mission_exists;
    
    IF NOT v_mission_exists THEN
        RAISE EXCEPTION 'Mission #% non trouvée', p_mission_id;
    END IF;

    -- Récupérer les infos de la mission
    BEGIN
        SELECT vehicule_id, chauffeur_id INTO v_vehicule_id, v_chauffeur_id
        FROM public.tb_missions
        WHERE mission_id = p_mission_id;
        
        RAISE LOG 'Mission trouvée - vehicule_id: %, chauffeur_id: %', v_vehicule_id, v_chauffeur_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Erreur lors de la récupération des infos de la mission: %', SQLERRM;
            RAISE;
    END;

    -- 1. Mettre à jour la mission
    BEGIN
        UPDATE public.tb_missions
        SET statut_mission = 'Terminée',
            date_arrivee_reelle = NOW(),
            updated_at = NOW()
        WHERE mission_id = p_mission_id;
        
        RAISE LOG 'Mission mise à jour avec succès';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Erreur lors de la mise à jour de la mission: %', SQLERRM;
            RAISE;
    END;

    -- 2. Enregistrer la dépense si montant > 0 et si c'est à la charge de l'entreprise
    IF p_montant > 0 AND p_is_charge_entreprise THEN
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
                COALESCE(p_raison, 'Course'), -- Utiliser 'Course' comme valeur par défaut si la raison est vide
                p_montant,
                p_devise,
                CONCAT('Dépense course #', p_mission_id, ': ', COALESCE(p_raison, 'Aucune raison spécifiée')),
                NOW()
            );
            
            RAISE LOG 'Dépense insérée avec succès - montant: %, devise: %', p_montant, p_devise;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Erreur lors de l''insertion de la dépense: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE LOG 'Pas de dépense à insérer - montant: %, is_charge_entreprise: %', p_montant, p_is_charge_entreprise;
    END IF;

    -- 3. Enregistrer dans le journal de bord (Technique)
    BEGIN
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
            'Fin de mission', -- Valeur par défaut pour éviter NOT NULL
            CONCAT('Clôture: ', COALESCE(p_raison, 'Aucune raison spécifiée'), '. Montant: ', p_montant, ' ', p_devise, '. Charge: ', CASE WHEN p_is_charge_entreprise THEN 'Entreprise' ELSE 'Client' END),
            NOW()
        );
        
        RAISE LOG 'Journal de bord mis à jour avec succès';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Erreur lors de l''insertion dans le journal de bord: %', SQLERRM;
            RAISE;
    END;

    RAISE LOG 'Fonction complete_mission_simple terminée avec succès';

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erreur dans complete_mission_simple: %', SQLERRM;
        RAISE;
END;
$$;