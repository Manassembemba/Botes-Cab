-- CORRIGER TOUS LES CLIENTS D'UN COUP - VERSION CORRIGÉE
-- Ce script calcule les vraies stats pour chaque client et met à jour la table

CREATE OR REPLACE FUNCTION public.fix_all_client_stats()
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
    -- Boucler sur tous les clients
    FOR client_rec IN SELECT * FROM tb_clients ORDER BY client_id
    LOOP
        -- Calculer les vraies valeurs pour CE client
        SELECT 
            COUNT(*),
            COALESCE(SUM(m.montant_total), 0),
            MAX(m.date_arrivee_reelle)
        INTO v_new_missions, v_new_total, v_derniere_date
        FROM tb_missions m
        WHERE m.client_id = client_rec.client_id 
        AND m.statut_mission = 'Terminée';
        
        -- Mettre à jour le client avec les nouvelles valeurs
        UPDATE tb_clients
        SET 
            nb_missions_total = COALESCE(v_new_missions, 0),
            montant_total_depense = COALESCE(v_new_total, 0),
            derniere_mission_date = v_derniere_date,
            est_fidele = (COALESCE(v_new_missions, 0) >= 10 OR COALESCE(v_new_total, 0) >= 1000)
        WHERE client_id = client_rec.client_id;
        
        -- Retourner le résultat pour affichage
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

-- EXÉCUTER LA CORRECTION et afficher uniquement les clients modifiés
SELECT * FROM public.fix_all_client_stats()
WHERE corrige = true;

-- NETTOYER la fonction temporaire
DROP FUNCTION IF EXISTS public.fix_all_client_stats();

-- VÉRIFICATION FINALE - Afficher tous les clients avec leurs stats
SELECT 
    client_id,
    nom || ' ' || COALESCE(prenom, '') AS client,
    telephone,
    nb_missions_total AS missions,
    montant_total_depense AS total_usd,
    est_fidele AS fidele,
    derniere_mission_date
FROM tb_clients
ORDER BY nb_missions_total DESC, montant_total_depense DESC;
