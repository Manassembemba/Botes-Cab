-- Migration: 20260210310000_enhance_client_system_with_categories.sql
-- Description: Amélioration du système de clients avec intégration des catégories et historique des préférences

-- Ajouter des colonnes pour les préférences client dans la table des clients
ALTER TABLE public.tb_clients 
ADD COLUMN IF NOT EXISTS categorie_preferee TEXT,
ADD COLUMN IF NOT EXISTS type_course_prefere TEXT,
ADD COLUMN IF NOT EXISTS historique_categories TEXT[], -- Tableau des catégories utilisées
ADD COLUMN IF NOT EXISTS historique_types_courses TEXT[]; -- Tableau des types de courses utilisés

-- Créer une table pour l'historique détaillé des missions par client
CREATE TABLE IF NOT EXISTS public.tb_historique_clients (
    historique_id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES public.tb_clients(client_id) ON DELETE CASCADE,
    mission_id INTEGER REFERENCES public.tb_missions(mission_id) ON DELETE SET NULL,
    vehicule_categorie TEXT, -- Catégorie du véhicule utilisé
    type_course TEXT, -- Type de course
    montant_paye NUMERIC(12,2),
    date_mission TIMESTAMP WITH TIME ZONE,
    evaluation INTEGER CHECK (evaluation >= 1 AND evaluation <= 5), -- Note sur 5
    commentaire TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_historique_clients_client ON public.tb_historique_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_historique_clients_date ON public.tb_historique_clients(date_mission);
CREATE INDEX IF NOT EXISTS idx_historique_clients_categorie ON public.tb_historique_clients(vehicule_categorie);
CREATE INDEX IF NOT EXISTS idx_historique_clients_type_course ON public.tb_historique_clients(type_course);

-- Fonction pour enrichir les statistiques client avec les préférences
CREATE OR REPLACE FUNCTION public.update_client_preferences(client_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    pref_categorie TEXT;
    pref_type_course TEXT;
    categories_utilisees TEXT[];
    types_courses_utilises TEXT[];
BEGIN
    -- Trouver la catégorie de véhicule la plus utilisée par le client
    SELECT vehicule_categorie INTO pref_categorie
    FROM (
        SELECT vehicule_categorie, COUNT(*) as count
        FROM public.tb_historique_clients
        WHERE client_id = client_id_param AND vehicule_categorie IS NOT NULL
        GROUP BY vehicule_categorie
        ORDER BY count DESC
        LIMIT 1
    ) AS cat_freq;

    -- Trouver le type de course le plus utilisé par le client
    SELECT type_course INTO pref_type_course
    FROM (
        SELECT type_course, COUNT(*) as count
        FROM public.tb_historique_clients
        WHERE client_id = client_id_param AND type_course IS NOT NULL
        GROUP BY type_course
        ORDER BY count DESC
        LIMIT 1
    ) AS type_freq;

    -- Obtenir toutes les catégories utilisées
    SELECT ARRAY_AGG(DISTINCT vehicule_categorie) INTO categories_utilisees
    FROM public.tb_historique_clients
    WHERE client_id = client_id_param AND vehicule_categorie IS NOT NULL;

    -- Obtenir tous les types de courses utilisés
    SELECT ARRAY_AGG(DISTINCT type_course) INTO types_courses_utilises
    FROM public.tb_historique_clients
    WHERE client_id = client_id_param AND type_course IS NOT NULL;

    -- Mettre à jour les préférences du client
    UPDATE public.tb_clients
    SET 
        categorie_preferee = pref_categorie,
        type_course_prefere = pref_type_course,
        historique_categories = categories_utilisees,
        historique_types_courses = types_courses_utilises
    WHERE client_id = client_id_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour ajouter une mission à l'historique client
CREATE OR REPLACE FUNCTION public.add_mission_to_client_history(
    p_client_id INTEGER,
    p_mission_id INTEGER,
    p_categorie TEXT,
    p_type_course TEXT,
    p_montant_paye NUMERIC
)
RETURNS VOID AS $$
BEGIN
    -- Insérer dans l'historique
    INSERT INTO public.tb_historique_clients (
        client_id,
        mission_id,
        vehicule_categorie,
        type_course,
        montant_paye,
        date_mission
    ) VALUES (
        p_client_id,
        p_mission_id,
        p_categorie,
        p_type_course,
        p_montant_paye,
        NOW()
    );

    -- Mettre à jour les préférences du client
    PERFORM public.update_client_preferences(p_client_id);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour ajouter automatiquement une mission à l'historique client quand une mission est terminée
CREATE OR REPLACE FUNCTION public.track_completed_mission_for_client()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicule_categorie TEXT;
    v_montant_paye NUMERIC;
BEGIN
    -- Si la mission est terminée et qu'elle a un client associé
    IF NEW.statut_mission = 'Terminée' AND NEW.client_id IS NOT NULL THEN
        -- Récupérer la catégorie du véhicule utilisé
        SELECT v.categorie INTO v_vehicule_categorie
        FROM public.tb_vehicules v
        WHERE v.vehicule_id = NEW.vehicule_id;

        -- Calculer le montant total payé pour cette mission
        SELECT COALESCE(SUM(p.montant), 0) INTO v_montant_paye
        FROM public.tb_paiements p
        WHERE p.mission_id = NEW.mission_id;

        -- Ajouter à l'historique du client
        PERFORM public.add_mission_to_client_history(
            NEW.client_id,
            NEW.mission_id,
            v_vehicule_categorie,
            NEW.type_course,
            v_montant_paye
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table des missions
DROP TRIGGER IF EXISTS track_client_mission_history ON public.tb_missions;
CREATE TRIGGER track_client_mission_history
    AFTER UPDATE OF statut_mission ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.track_completed_mission_for_client();

-- Mettre à jour la fonction de vérification de fidélité pour inclure plus de critères
CREATE OR REPLACE FUNCTION public.check_client_fidelite(client_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    nb_missions INTEGER;
    montant_total NUMERIC;
    nb_missions_vip INTEGER;
    taux_satisfaction NUMERIC;
BEGIN
    -- Calculer le nombre de missions et le montant total pour ce client
    SELECT 
        COUNT(*), 
        COALESCE(SUM(m.montant_total), 0)
    INTO nb_missions, montant_total
    FROM public.tb_missions m
    WHERE m.client_id = client_id_param AND m.statut_mission = 'Terminée';

    -- Calculer le nombre de missions VIP
    SELECT COUNT(*) INTO nb_missions_vip
    FROM public.tb_missions m
    JOIN public.tb_vehicules v ON m.vehicule_id = v.vehicule_id
    WHERE m.client_id = client_id_param 
      AND m.statut_mission = 'Terminée'
      AND v.categorie = 'VIP';

    -- Calculer le taux de satisfaction moyen
    SELECT ROUND(COALESCE(AVG(evaluation), 0), 2) INTO taux_satisfaction
    FROM public.tb_historique_clients
    WHERE client_id = client_id_param AND evaluation IS NOT NULL;

    -- Mettre à jour les statistiques du client
    UPDATE public.tb_clients 
    SET 
        nb_missions_total = nb_missions,
        montant_total_depense = montant_total,
        derniere_mission_date = (
            SELECT MAX(date_arrivee_reelle) 
            FROM public.tb_missions 
            WHERE client_id = client_id_param AND statut_mission = 'Terminée'
        ),
        -- Critères de fidélité améliorés :
        -- 1. 10 missions OU 1000 USD dépensés
        -- 2. PLUS de missions VIP que de simples courses urbaines
        -- 3. Taux de satisfaction > 4.0
        est_fidele = (
            (nb_missions >= 10 OR montant_total >= 1000) -- Ancien critère
            AND (
                nb_missions_vip > (nb_missions - nb_missions_vip) -- Plus de VIP que de non-VIP
                OR taux_satisfaction > 4.0 -- Ou bon taux de satisfaction
            )
        )
    WHERE client_id = client_id_param;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour le trigger existant pour utiliser la nouvelle fonction de fidélité
CREATE OR REPLACE FUNCTION public.update_client_stats_after_mission()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la mission est terminée et qu'elle a un client associé
    IF NEW.statut_mission = 'Terminée' AND NEW.client_id IS NOT NULL THEN
        -- Mettre à jour les statistiques du client
        PERFORM public.check_client_fidelite(NEW.client_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger sur la table des missions
DROP TRIGGER IF EXISTS update_client_stats_on_mission_change ON public.tb_missions;
CREATE TRIGGER update_client_stats_on_mission_change
    AFTER INSERT OR UPDATE OF statut_mission ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_stats_after_mission();