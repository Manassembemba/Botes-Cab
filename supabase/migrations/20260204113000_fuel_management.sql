-- Migration: 20260204113000_fuel_management.sql
-- Description: Ajout du support pour la gestion du carburant par mission.

-- 1. Ajouter mission_id à tb_depenses
ALTER TABLE public.tb_depenses 
ADD COLUMN IF NOT EXISTS mission_id bigint REFERENCES public.tb_missions(mission_id) ON DELETE SET NULL;

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_depenses_mission ON public.tb_depenses(mission_id);

-- 2. Fonction pour clôturer une mission avec carburant et kilométrage
-- 2. Fonction pour clôturer une mission avec une dépense simplifiée
CREATE OR REPLACE FUNCTION public.complete_mission_with_fuel(
    p_mission_id bigint,
    p_montant numeric(12,2),
    p_devise varchar(10),
    p_raison text DEFAULT NULL,
    p_is_charge_entreprise boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vehicule_id int;
    v_chauffeur_id int;
    v_type_mission varchar(100);
BEGIN
    -- Récupérer les infos de la mission
    SELECT vehicule_id, chauffeur_id, type_course INTO v_vehicule_id, v_chauffeur_id, v_type_mission
    FROM public.tb_missions
    WHERE mission_id = p_mission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mission #% non trouvée', p_mission_id;
    END IF;

    -- 1. Mettre à jour la mission (toujours terminée)
    UPDATE public.tb_missions
    SET statut_mission = 'Terminée',
        date_arrivee_reelle = NOW(),
        updated_at = NOW()
    WHERE mission_id = p_mission_id;

    -- 2. Enregistrer dans le journal de bord (Technique)
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
        CONCAT(
            CASE WHEN p_is_charge_entreprise THEN '[Charge Entreprise] ' ELSE '[Charge Client] ' END,
            COALESCE(p_raison, 'Mission terminée'),
            CASE WHEN p_montant > 0 THEN ' - Frais: ' || p_montant || ' ' || p_devise ELSE '' END
        ),
        NOW()
    );

    -- 3. Enregistrer la dépense UNIQUEMENT si c'est à charge entreprise et montant > 0
    IF p_is_charge_entreprise AND p_montant > 0 THEN
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
            'Carburant/Mission',
            p_montant,
            p_devise,
            CONCAT('Course #', p_mission_id, ' (', v_type_mission, ')', CASE WHEN p_raison IS NOT NULL THEN ' - ' || p_raison ELSE '' END),
            NOW()
        );
    END IF;

END;
$$;
