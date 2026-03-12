-- Script de débogage : Vérifier l'état des stats clients
-- Exécutez ce script dans le SQL Editor du Dashboard Supabase

-- ============================================================================
-- 1. Vérifier les missions terminées par client
-- ============================================================================

SELECT 
    c.client_id,
    c.nom || ' ' || COALESCE(c.prenom, '') AS client_complet,
    c.nb_missions_total AS "Stats BD (nb_missions_total)",
    COUNT(m.mission_id) AS "Vrai Nombre Missions",
    c.montant_total_depense AS "Stats BD (montant_total_depense)",
    COALESCE(SUM(m.montant_total), 0) AS "Vrai Montant Total",
    c.est_fidele AS "Statut Fidèle"
FROM tb_clients c
LEFT JOIN tb_missions m ON c.client_id = m.client_id AND m.statut_mission = 'Terminée'
GROUP BY c.client_id, c.nom, c.prenom, c.nb_missions_total, c.montant_total_depense, c.est_fidele
ORDER BY c.client_id;

-- ============================================================================
-- 2. Vérifier les triggers existants
-- ============================================================================

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tb_missions'
AND trigger_name LIKE '%client%'
ORDER BY trigger_name;

-- ============================================================================
-- 3. Vérifier les fonctions existantes
-- ============================================================================

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%client%' OR routine_name LIKE '%fidelite%')
ORDER BY routine_name;

-- ============================================================================
-- 4. Tester manuellement la fonction check_client_fidelite
-- ============================================================================

-- Remplacez 1 par un client_id qui a des missions terminées
SELECT 
    client_id,
    nom,
    nb_missions_total AS "Avant",
    montant_total_depense AS "Avant"
FROM tb_clients
WHERE client_id = 1;

-- Exécuter la fonction pour ce client
SELECT public.check_client_fidelite(1);

-- Vérifier après
SELECT 
    client_id,
    nom,
    nb_missions_total AS "Après",
    montant_total_depense AS "Après",
    est_fidele AS "Fidèle ?"
FROM tb_clients
WHERE client_id = 1;

-- ============================================================================
-- 5. Trouver les clients avec stats incohérentes
-- ============================================================================

SELECT 
    c.client_id,
    c.nom,
    c.nb_missions_total AS "Stats BD",
    COUNT(m.mission_id) AS "Réel",
    c.nb_missions_total - COUNT(m.mission_id) AS "Différence"
FROM tb_clients c
LEFT JOIN tb_missions m ON c.client_id = m.client_id AND m.statut_mission = 'Terminée'
GROUP BY c.client_id, c.nom, c.nb_missions_total
HAVING c.nb_missions_total != COUNT(m.mission_id)
ORDER BY différence DESC;

-- ============================================================================
-- 6. Vérifier si les missions ont des client_id
-- ============================================================================

SELECT 
    statut_mission,
    COUNT(*) AS total,
    COUNT(client_id) AS avec_client_id,
    COUNT(client_id) * 100 / COUNT(*) AS "% avec client"
FROM tb_missions
GROUP BY statut_mission;

-- ============================================================================
-- 7. Exécuter la recalcul complète (si nécessaire)
-- ============================================================================

-- Fonction temporaire pour recalculer toutes les stats
CREATE OR REPLACE FUNCTION public.recalculate_all_client_stats_debug()
RETURNS TABLE(
    client_id INTEGER,
    nom TEXT,
    old_missions BIGINT,
    new_missions BIGINT,
    old_total NUMERIC,
    new_total NUMERIC,
    updated BOOLEAN
) AS $$
DECLARE
    client_record RECORD;
    v_old_missions INTEGER;
    v_old_total NUMERIC;
    v_new_missions INTEGER;
    v_new_total NUMERIC;
BEGIN
    FOR client_record IN SELECT * FROM tb_clients
    LOOP
        -- Sauvegarder anciennes valeurs
        v_old_missions := client_record.nb_missions_total;
        v_old_total := client_record.montant_total_depense;
        
        -- Calculer nouvelles valeurs
        SELECT 
            COUNT(*),
            COALESCE(SUM(montant_total), 0)
        INTO v_new_missions, v_new_total
        FROM tb_missions
        WHERE client_id = client_record.client_id 
        AND statut_mission = 'Terminée';
        
        -- Mettre à jour
        UPDATE tb_clients
        SET 
            nb_missions_total = v_new_missions,
            montant_total_depense = v_new_total,
            est_fidele = (v_new_missions >= 10 OR v_new_total >= 1000)
        WHERE client_id = client_record.client_id;
        
        -- Retourner résultat
        RETURN QUERY SELECT 
            client_record.client_id,
            (client_record.nom || ' ' || COALESCE(client_record.prenom, ''))::TEXT,
            v_old_missions::BIGINT,
            v_new_missions::BIGINT,
            v_old_total,
            v_new_total,
            (v_old_missions != v_new_missions OR v_old_total != v_new_total);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter le recalcul
SELECT * FROM public.recalculate_all_client_stats_debug()
WHERE updated = true;

-- Nettoyer
DROP FUNCTION IF EXISTS public.recalculate_all_client_stats_debug();
