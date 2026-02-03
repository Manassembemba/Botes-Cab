-- Migration : Vues analytiques pour rapports financiers
-- Description : Vues matérialisées pour analyse de rentabilité et rapports comptables

-- 1. Vue : Rentabilité par véhicule (TCO - Total Cost of Ownership)
CREATE OR REPLACE VIEW public.vue_rentabilite_vehicules AS
SELECT 
    v.vehicule_id,
    v.immatriculation,
    v.marque,
    v.modele,
    v.categorie,
    
    -- Revenus générés
    COALESCE(SUM(m.montant_total), 0) as revenus_totaux,
    COUNT(DISTINCT m.mission_id) as nombre_missions,
    COALESCE(AVG(m.montant_total), 0) as revenu_moyen_mission,
    
    -- Dépenses
    COALESCE(SUM(CASE WHEN d.categorie = 'Carburant' THEN d.montant ELSE 0 END), 0) as depenses_carburant,
    COALESCE(SUM(CASE WHEN d.categorie = 'Maintenance' THEN d.montant ELSE 0 END), 0) as depenses_maintenance,
    COALESCE(SUM(d.montant), 0) as depenses_totales,
    
    -- Rentabilité
    COALESCE(SUM(m.montant_total), 0) - COALESCE(SUM(d.montant), 0) as marge_nette,
    CASE 
        WHEN COALESCE(SUM(d.montant), 0) > 0 
        THEN ((COALESCE(SUM(m.montant_total), 0) - COALESCE(SUM(d.montant), 0)) / COALESCE(SUM(d.montant), 1)) * 100
        ELSE 0 
    END as roi_pourcentage,
    
    -- Statut de rentabilité
    CASE 
        WHEN COALESCE(SUM(m.montant_total), 0) - COALESCE(SUM(d.montant), 0) > 0 THEN 'Rentable'
        WHEN COALESCE(SUM(m.montant_total), 0) - COALESCE(SUM(d.montant), 0) < 0 THEN 'Non Rentable'
        ELSE 'Neutre'
    END as statut_rentabilite

FROM public.tb_vehicules v
LEFT JOIN public.tb_missions m ON v.vehicule_id = m.vehicule_id 
    AND m.statut_mission = 'Terminée'
LEFT JOIN public.tb_depenses d ON v.vehicule_id = d.vehicule_id

GROUP BY v.vehicule_id, v.immatriculation, v.marque, v.modele, v.categorie
ORDER BY marge_nette DESC;

-- 2. Vue : Rentabilité par chauffeur
CREATE OR REPLACE VIEW public.vue_rentabilite_chauffeurs AS
WITH ChauffeurStats AS (
    SELECT 
        m.chauffeur_id,
        COUNT(DISTINCT m.mission_id) as nombre_missions,
        COALESCE(SUM(m.montant_total), 0) as revenus_generes
    FROM public.tb_missions m
    WHERE m.statut_mission = 'Terminée'
    GROUP BY m.chauffeur_id
),
ChauffeurRefunds AS (
    SELECT 
        m.chauffeur_id,
        COUNT(DISTINCT r.remboursement_id) as nombre_remboursements,
        COALESCE(SUM(r.montant), 0) as total_remboursements
    FROM public.tb_remboursements r
    JOIN public.tb_missions m ON r.mission_id = m.mission_id
    WHERE r.statut = 'Validé'
    GROUP BY m.chauffeur_id
)
SELECT 
    c.chauffeur_id,
    c.nom,
    c.prenom,
    c.tel,
    
    -- Performance
    COALESCE(s.nombre_missions, 0) as nombre_missions,
    COALESCE(s.revenus_generes, 0) as revenus_generes,
    CASE 
        WHEN COALESCE(s.nombre_missions, 0) > 0 
        THEN COALESCE(s.revenus_generes, 0) / s.nombre_missions
        ELSE 0 
    END as revenu_moyen_mission,
    
    -- Remboursements
    COALESCE(ref.total_remboursements, 0) as total_remboursements,
    COALESCE(ref.nombre_remboursements, 0) as nombre_remboursements,
    
    -- Rentabilité
    COALESCE(s.revenus_generes, 0) - COALESCE(ref.total_remboursements, 0) as marge_nette,
    CASE 
        WHEN COALESCE(s.nombre_missions, 0) > 0 
        THEN (COALESCE(s.revenus_generes, 0) - COALESCE(ref.total_remboursements, 0)) / s.nombre_missions
        ELSE 0 
    END as marge_moyenne_mission

FROM public.tb_chauffeurs c
LEFT JOIN ChauffeurStats s ON c.chauffeur_id = s.chauffeur_id
LEFT JOIN ChauffeurRefunds ref ON c.chauffeur_id = ref.chauffeur_id

ORDER BY marge_nette DESC;

-- 3. Vue : Rentabilité par type de course
CREATE OR REPLACE VIEW public.vue_rentabilite_types_course AS
SELECT 
    COALESCE(m.type_course, 'Non spécifié') as type_course,
    
    -- Volume
    COUNT(DISTINCT m.mission_id) as nombre_missions,
    ROUND(COUNT(DISTINCT m.mission_id) * 100.0 / NULLIF(SUM(COUNT(DISTINCT m.mission_id)) OVER (), 0), 2) as pourcentage_volume,
    
    -- Revenus
    COALESCE(SUM(m.montant_total), 0) as revenus_totaux,
    COALESCE(AVG(m.montant_total), 0) as revenu_moyen,
    COALESCE(MIN(m.montant_total), 0) as revenu_min,
    COALESCE(MAX(m.montant_total), 0) as revenu_max,
    
    -- Paiements
    COALESCE(SUM(m.acompte), 0) as total_paye,
    COALESCE(SUM(m.solde), 0) as total_solde,
    CASE 
        WHEN SUM(m.montant_total) > 0 
        THEN ROUND((SUM(m.acompte) / SUM(m.montant_total)) * 100, 2)
        ELSE 0 
    END as taux_paiement

FROM public.tb_missions m
WHERE m.statut_mission = 'Terminée'

GROUP BY m.type_course
ORDER BY revenus_totaux DESC;

-- 4. Vue : Compte de résultat mensuel
CREATE OR REPLACE VIEW public.vue_compte_resultat AS
SELECT 
    TO_CHAR(date_transaction, 'YYYY-MM') as mois,
    TO_CHAR(date_transaction, 'YYYY') as annee,
    TO_CHAR(date_transaction, 'MM') as mois_numero,
    
    -- Revenus (Entrées)
    COALESCE(SUM(CASE WHEN type = 'Entrée' THEN montant ELSE 0 END), 0) as total_revenus,
    COALESCE(SUM(CASE WHEN type = 'Entrée' AND devise = 'USD' THEN montant ELSE 0 END), 0) as revenus_usd,
    COALESCE(SUM(CASE WHEN type = 'Entrée' AND devise = 'CDF' THEN montant ELSE 0 END), 0) as revenus_cdf,
    
    -- Dépenses (Sorties)
    COALESCE(SUM(CASE WHEN type = 'Sortie' THEN montant ELSE 0 END), 0) as total_depenses,
    COALESCE(SUM(CASE WHEN type = 'Sortie' AND devise = 'USD' THEN montant ELSE 0 END), 0) as depenses_usd,
    COALESCE(SUM(CASE WHEN type = 'Sortie' AND devise = 'CDF' THEN montant ELSE 0 END), 0) as depenses_cdf,
    
    -- Résultat
    COALESCE(SUM(CASE WHEN type = 'Entrée' THEN montant ELSE -montant END), 0) as resultat_net,
    
    -- Nombre de transactions
    COUNT(CASE WHEN type = 'Entrée' THEN 1 END) as nb_entrees,
    COUNT(CASE WHEN type = 'Sortie' THEN 1 END) as nb_sorties

FROM public.tb_caisse

GROUP BY TO_CHAR(date_transaction, 'YYYY-MM'), 
         TO_CHAR(date_transaction, 'YYYY'), 
         TO_CHAR(date_transaction, 'MM')
ORDER BY mois DESC;

-- 5. Vue : Suivi des créances (missions impayées)
CREATE OR REPLACE VIEW public.vue_creances AS
SELECT 
    m.mission_id,
    m.client_nom,
    m.type_course,
    m.lieu_depart,
    m.lieu_arrivee,
    m.date_depart_prevue,
    m.date_arrivee_reelle,
    m.statut_mission,
    
    -- Montants
    m.montant_total,
    m.acompte,
    m.solde,
    m.devise,
    
    -- Ancienneté de la créance
    CASE 
        WHEN m.date_arrivee_reelle IS NOT NULL 
        THEN EXTRACT(DAY FROM (NOW() - m.date_arrivee_reelle))
        ELSE EXTRACT(DAY FROM (NOW() - m.date_depart_prevue))
    END as jours_impaye,
    
    -- Catégorie de créance
    CASE 
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(m.date_arrivee_reelle, m.date_depart_prevue))) <= 7 THEN 'Récente'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(m.date_arrivee_reelle, m.date_depart_prevue))) <= 30 THEN 'À relancer'
        ELSE 'En retard'
    END as categorie_creance,
    
    -- Véhicule et chauffeur
    v.immatriculation,
    CONCAT(c.prenom, ' ', c.nom) as chauffeur

FROM public.tb_missions m
LEFT JOIN public.tb_vehicules v ON m.vehicule_id = v.vehicule_id
LEFT JOIN public.tb_chauffeurs c ON m.chauffeur_id = c.chauffeur_id

WHERE m.solde > 0
  AND m.statut_mission IN ('Terminée', 'En cours')

ORDER BY jours_impaye DESC, m.solde DESC;

-- 6. Vue : Dépenses par catégorie (mensuel)
CREATE OR REPLACE VIEW public.vue_depenses_par_categorie AS
SELECT 
    TO_CHAR(date_depense, 'YYYY-MM') as mois,
    categorie,
    
    COUNT(*) as nombre_depenses,
    COALESCE(SUM(montant), 0) as montant_total,
    COALESCE(AVG(montant), 0) as montant_moyen,
    
    -- Répartition par devise
    COALESCE(SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END), 0) as montant_usd,
    COALESCE(SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END), 0) as montant_cdf

FROM public.tb_depenses

GROUP BY TO_CHAR(date_depense, 'YYYY-MM'), categorie
ORDER BY mois DESC, montant_total DESC;

-- Commentaires pour documentation
COMMENT ON VIEW public.vue_rentabilite_vehicules IS 'Analyse de rentabilité par véhicule (TCO, revenus, dépenses, ROI)';
COMMENT ON VIEW public.vue_rentabilite_chauffeurs IS 'Performance et rentabilité par chauffeur';
COMMENT ON VIEW public.vue_rentabilite_types_course IS 'Analyse de rentabilité par type de course';
COMMENT ON VIEW public.vue_compte_resultat IS 'Compte de résultat mensuel (revenus vs dépenses)';
COMMENT ON VIEW public.vue_creances IS 'Suivi des créances clients (missions avec solde impayé)';
COMMENT ON VIEW public.vue_depenses_par_categorie IS 'Répartition des dépenses par catégorie et par mois';

-- Créer des index pour améliorer les performances des vues
CREATE INDEX IF NOT EXISTS idx_missions_statut_type ON public.tb_missions(statut_mission, type_course);
CREATE INDEX IF NOT EXISTS idx_caisse_date_type ON public.tb_caisse(date_transaction, type);
CREATE INDEX IF NOT EXISTS idx_depenses_date_categorie ON public.tb_depenses(date_depense, categorie);
CREATE INDEX IF NOT EXISTS idx_missions_solde ON public.tb_missions(solde) WHERE solde > 0;
