-- ============================================================================
-- SCRIPT FINAL - Lier missions aux clients + recalculer stats
-- 100% corrigé pour éviter les ambiguïtés de colonnes
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Lier automatiquement les missions aux clients
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_missions_to_clients()
RETURNS TABLE(
    p_mission_id INTEGER,
    old_client_nom TEXT,
    matched_client_id INTEGER,
    matched_client_nom TEXT,
    match_type TEXT
) AS $$
DECLARE
    mission_row RECORD;
    v_client_id INTEGER;
    v_client_nom TEXT;
    v_match_type TEXT;
BEGIN
    FOR mission_row IN 
        SELECT * FROM tb_missions 
        WHERE client_id IS NULL 
        AND client_nom IS NOT NULL
        ORDER BY mission_id
    LOOP
        -- Reset variables
        v_client_id := NULL;
        v_client_nom := NULL;
        v_match_type := NULL;
        
        -- Match 1: Par nom exact
        SELECT c.client_id, c.nom || ' ' || c.prenom, 'nom_exact'
        INTO v_client_id, v_client_nom, v_match_type
        FROM tb_clients c
        WHERE UPPER(TRIM(mission_row.client_nom)) = UPPER(TRIM(c.nom))
        LIMIT 1;
        
        -- Match 2: Par nom partiel
        IF v_client_id IS NULL THEN
            SELECT c.client_id, c.nom || ' ' || c.prenom, 'nom_partiel'
            INTO v_client_id, v_client_nom, v_match_type
            FROM tb_clients c
            WHERE mission_row.client_nom ILIKE '%' || c.nom || '%'
            OR mission_row.client_nom ILIKE '%' || c.prenom || '%'
            LIMIT 1;
        END IF;
        
        -- Match 3: Par téléphone
        IF v_client_id IS NULL THEN
            SELECT c.client_id, c.nom || ' ' || c.prenom, 'telephone'
            INTO v_client_id, v_client_nom, v_match_type
            FROM tb_clients c
            WHERE c.telephone IS NOT NULL
            AND (
                mission_row.client_nom ILIKE '%' || REPLACE(c.telephone, ' ', '') || '%'
                OR mission_row.client_nom ILIKE '%' || c.telephone || '%'
            )
            LIMIT 1;
        END IF;
        
        -- Si match trouvé, mettre à jour
        IF v_client_id IS NOT NULL THEN
            UPDATE tb_missions m
            SET client_id = v_client_id
            WHERE m.mission_id = mission_row.mission_id;
            
            RETURN QUERY SELECT 
                mission_row.mission_id,
                mission_row.client_nom,
                v_client_id,
                v_client_nom,
                v_match_type;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter le matching
SELECT * FROM public.link_missions_to_clients();

-- Nettoyer
DROP FUNCTION IF EXISTS public.link_missions_to_clients();

-- ============================================================================
-- ÉTAPE 2: Vérifier le résultat
-- ============================================================================

SELECT 
    COUNT(*) AS "Total Missions",
    COUNT(client_id) AS "Avec client_id",
    COUNT(client_id) * 100 / NULLIF(COUNT(*), 0) AS "% avec client_id"
FROM tb_missions;

-- ============================================================================
-- ÉTAPE 3: Recalculer les stats clients
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fix_all_client_stats_v2()
RETURNS TABLE(
    p_client_id INTEGER,
    client_nom TEXT,
    missions_avant INTEGER,
    missions_apres INTEGER,
    montant_avant NUMERIC,
    montant_apres NUMERIC,
    corrige BOOLEAN
) AS $$
DECLARE
    client_row RECORD;
    v_new_missions INTEGER;
    v_new_total NUMERIC;
    v_derniere_date TIMESTAMPTZ;
BEGIN
    FOR client_row IN SELECT * FROM tb_clients ORDER BY client_id
    LOOP
        SELECT 
            COUNT(*),
            COALESCE(SUM(m.montant_total), 0),
            MAX(m.date_arrivee_reelle)
        INTO v_new_missions, v_new_total, v_derniere_date
        FROM tb_missions m
        WHERE m.client_id = client_row.client_id 
        AND m.statut_mission = 'Terminée';
        
        UPDATE tb_clients c
        SET 
            nb_missions_total = COALESCE(v_new_missions, 0),
            montant_total_depense = COALESCE(v_new_total, 0),
            derniere_mission_date = v_derniere_date,
            est_fidele = (COALESCE(v_new_missions, 0) >= 10 OR COALESCE(v_new_total, 0) >= 1000)
        WHERE c.client_id = client_row.client_id;
        
        RETURN QUERY SELECT 
            client_row.client_id,
            (client_row.nom || ' ' || COALESCE(client_row.prenom, ''))::TEXT,
            client_row.nb_missions_total,
            COALESCE(v_new_missions, 0),
            client_row.montant_total_depense,
            COALESCE(v_new_total, 0),
            (client_row.nb_missions_total != COALESCE(v_new_missions, 0) 
             OR client_row.montant_total_depense != COALESCE(v_new_total, 0));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la correction
SELECT * FROM public.fix_all_client_stats_v2()
WHERE corrige = true;

-- Nettoyer
DROP FUNCTION IF EXISTS public.fix_all_client_stats_v2();

-- ============================================================================
-- ÉTAPE 4: Résultat final
-- ============================================================================

SELECT 
    client_id,
    nom || ' ' || COALESCE(prenom, '') AS client,
    telephone,
    nb_missions_total AS missions,
    montant_total_depense AS total_usd,
    est_fidele AS fidele
FROM tb_clients
ORDER BY nb_missions_total DESC, montant_total_depense DESC;
