-- Script de correction RAPIDE - À exécuter dans Supabase SQL Editor
-- Ce script va forcer la mise à jour de TOUS les clients

-- ============================================================================
-- ÉTAPE 1: Vérifier combien de missions ont un client_id
-- ============================================================================

SELECT 
    COUNT(*) AS "Total Missions",
    COUNT(client_id) AS "Avec client_id",
    COUNT(client_id) * 100 / COUNT(*) AS "% Liées"
FROM tb_missions;

-- ============================================================================
-- ÉTAPE 2: Voir les clients qui DEVRAIENT avoir des stats
-- ============================================================================

SELECT 
    c.client_id,
    c.nom || ' ' || COALESCE(c.prenom, '') AS client,
    c.telephone,
    COUNT(m.mission_id) AS "Missions Terminées",
    COALESCE(SUM(m.montant_total), 0) AS "Total Dépensé"
FROM tb_clients c
LEFT JOIN tb_missions m ON c.client_id = m.client_id AND m.statut_mission = 'Terminée'
GROUP BY c.client_id, c.nom, c.prenom, c.telephone
HAVING COUNT(m.mission_id) > 0
ORDER BY "Total Dépensé" DESC;

-- ============================================================================
-- ÉTAPE 3: Fonction de correction MASSIVE
-- ============================================================================

-- Créer la fonction de correction
CREATE OR REPLACE FUNCTION public.fix_all_client_stats()
RETURNS TABLE(
    client_id INTEGER,
    client_nom TEXT,
    missions_avant INTEGER,
    missions_apres INTEGER,
    montant_avant NUMERIC,
    montant_apres NUMERIC,
    corrige BOOLEAN
) AS $$
DECLARE
    client_record RECORD;
    v_new_missions INTEGER;
    v_new_total NUMERIC;
BEGIN
    FOR client_record IN SELECT * FROM tb_clients ORDER BY client_id
    LOOP
        -- Calculer les vraies valeurs
        SELECT 
            COUNT(*),
            COALESCE(SUM(montant_total), 0)
        INTO v_new_missions, v_new_total
        FROM tb_missions
        WHERE client_id = client_record.client_id 
        AND statut_mission = 'Terminée';
        
        -- Mettre à jour le client
        UPDATE tb_clients
        SET 
            nb_missions_total = v_new_missions,
            montant_total_depense = v_new_total,
            derniere_mission_date = (
                SELECT MAX(date_arrivee_reelle)
                FROM tb_missions
                WHERE client_id = client_record.client_id 
                AND statut_mission = 'Terminée'
            ),
            est_fidele = (v_new_missions >= 10 OR v_new_total >= 1000)
        WHERE client_id = client_record.client_id;
        
        -- Retourner le résultat
        RETURN QUERY SELECT 
            client_record.client_id,
            (client_record.nom || ' ' || COALESCE(client_record.prenom, ''))::TEXT,
            client_record.nb_missions_total,
            v_new_missions,
            client_record.montant_total_depense,
            v_new_total,
            (client_record.nb_missions_total != v_new_missions 
             OR client_record.montant_total_depense != v_new_total);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 4: Exécuter la correction
-- ============================================================================

-- Afficher uniquement les clients CORRIGÉS
SELECT * FROM public.fix_all_client_stats()
WHERE corrige = true;

-- ============================================================================
-- ÉTAPE 5: Vérification finale
-- ============================================================================

-- Afficher tous les clients avec leurs stats
SELECT 
    client_id,
    nom || ' ' || COALESCE(prenom, '') AS client,
    nb_missions_total AS missions,
    montant_total_depense AS total_usd,
    est_fidele AS fidele,
    derniere_mission_date AS derniere_mission
FROM tb_clients
ORDER BY nb_missions_total DESC, montant_total_depense DESC;

-- ============================================================================
-- ÉTAPE 6: Nettoyer la fonction temporaire
-- ============================================================================

DROP FUNCTION IF EXISTS public.fix_all_client_stats();

-- ============================================================================
-- ÉTAPE 7: Vérifier les triggers
-- ============================================================================

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tb_missions'
AND trigger_name LIKE '%client%'
ORDER BY trigger_name;
