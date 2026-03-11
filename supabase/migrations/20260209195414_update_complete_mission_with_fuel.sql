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