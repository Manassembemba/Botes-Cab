-- ============================================================================
-- DIAGNOSTIC COMPLET - Pourquoi les stats clients sont à 0
-- ============================================================================

-- 1. Vérifier si les missions ont des client_id
SELECT 
    COUNT(*) AS "Total Missions",
    COUNT(client_id) AS "Avec client_id",
    COUNT(client_nom) AS "Avec client_nom",
    COUNT(client_id) * 100 / NULLIF(COUNT(*), 0) AS "% avec client_id"
FROM tb_missions;

-- 2. Voir la structure des missions
SELECT 
    mission_id,
    client_id,
    client_nom,
    statut_mission,
    montant_total,
    date_depart_prevue
FROM tb_missions
ORDER BY mission_id DESC
LIMIT 20;

-- 3. Voir tous les clients
SELECT 
    client_id,
    nom,
    prenom,
    telephone,
    nb_missions_total,
    montant_total_depense
FROM tb_clients
ORDER BY client_id;

-- 4. Tenter de faire le matching automatiquement
-- Ce script va lier les missions aux clients par nom/téléphone
CREATE OR REPLACE FUNCTION public.link_missions_to_clients()
RETURNS TABLE(
    mission_id INTEGER,
    old_client_nom TEXT,
    matched_client_id INTEGER,
    matched_client_nom TEXT,
    match_type TEXT
) AS $$
DECLARE
    mission_rec RECORD;
    v_client_id INTEGER;
    v_client_nom TEXT;
    v_match_type TEXT;
BEGIN
    FOR mission_rec IN 
        SELECT * FROM tb_missions 
        WHERE client_id IS NULL 
        AND client_nom IS NOT NULL
    LOOP
        -- Essayer de trouver un client correspondant
        
        -- Match 1: Par téléphone (si disponible dans client_nom)
        SELECT c.client_id, c.nom || ' ' || c.prenom, 'telephone'
        INTO v_client_id, v_client_nom, v_match_type
        FROM tb_clients c
        WHERE c.telephone IS NOT NULL
        AND (
            mission_rec.client_nom ILIKE '%' || REPLACE(c.telephone, ' ', '') || '%'
            OR mission_rec.client_nom ILIKE '%' || c.telephone || '%'
        )
        LIMIT 1;
        
        -- Match 2: Par nom exact
        IF v_client_id IS NULL THEN
            SELECT c.client_id, c.nom || ' ' || c.prenom, 'nom_exact'
            INTO v_client_id, v_client_nom, v_match_type
            FROM tb_clients c
            WHERE UPPER(TRIM(mission_rec.client_nom)) = UPPER(TRIM(c.nom))
            LIMIT 1;
        END IF;
        
        -- Match 3: Par nom partiel
        IF v_client_id IS NULL THEN
            SELECT c.client_id, c.nom || ' ' || c.prenom, 'nom_partiel'
            INTO v_client_id, v_client_nom, v_match_type
            FROM tb_clients c
            WHERE mission_rec.client_nom ILIKE '%' || c.nom || '%'
            OR mission_rec.client_nom ILIKE '%' || c.prenom || '%'
            LIMIT 1;
        END IF;
        
        -- Si match trouvé, mettre à jour
        IF v_client_id IS NOT NULL THEN
            UPDATE tb_missions
            SET client_id = v_client_id
            WHERE mission_id = mission_rec.mission_id;
            
            RETURN QUERY SELECT 
                mission_rec.mission_id,
                mission_rec.client_nom,
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

-- 5. Vérifier le résultat
SELECT 
    COUNT(*) AS "Total Missions",
    COUNT(client_id) AS "Avec client_id",
    COUNT(client_id) * 100 / NULLIF(COUNT(*), 0) AS "% avec client_id"
FROM tb_missions;

-- 6. Maintenant, recalculer les stats clients
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
    client_rec RECORD;
    v_new_missions INTEGER;
    v_new_total NUMERIC;
    v_derniere_date TIMESTAMPTZ;
BEGIN
    FOR client_rec IN SELECT * FROM tb_clients ORDER BY client_id
    LOOP
        SELECT 
            COUNT(*),
            COALESCE(SUM(m.montant_total), 0),
            MAX(m.date_arrivee_reelle)
        INTO v_new_missions, v_new_total, v_derniere_date
        FROM tb_missions m
        WHERE m.client_id = client_rec.client_id 
        AND m.statut_mission = 'Terminée';
        
        UPDATE tb_clients
        SET 
            nb_missions_total = COALESCE(v_new_missions, 0),
            montant_total_depense = COALESCE(v_new_total, 0),
            derniere_mission_date = v_derniere_date,
            est_fidele = (COALESCE(v_new_missions, 0) >= 10 OR COALESCE(v_new_total, 0) >= 1000)
        WHERE client_id = client_rec.client_id;
        
        RETURN QUERY SELECT 
            client_rec.client_id,
            (client_rec.nom || ' ' || COALESCE(client_rec.prenom, ''))::TEXT,
            client_rec.nb_missions_total,
            COALESCE(v_new_missions, 0),
            client_rec.montant_total_depense,
            COALESCE(v_new_total, 0),
            (client_rec.nb_missions_total != COALESCE(v_new_missions, 0) 
             OR client_rec.montant_total_depense != COALESCE(v_new_total, 0));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la correction
SELECT * FROM public.fix_all_client_stats_v2()
WHERE corrige = true;

-- Nettoyer
DROP FUNCTION IF EXISTS public.fix_all_client_stats_v2();

-- 7. Résultat final
SELECT 
    client_id,
    nom || ' ' || COALESCE(prenom, '') AS client,
    telephone,
    nb_missions_total AS missions,
    montant_total_depense AS total_usd,
    est_fidele AS fidele
FROM tb_clients
ORDER BY nb_missions_total DESC;
