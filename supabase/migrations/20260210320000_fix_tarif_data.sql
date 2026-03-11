-- Migration: 20260210320000_fix_tarif_data.sql
-- Description: Correction des données de tarifs pour assurer la correspondance avec les catégories et types de courses

-- Vérifier les catégories de véhicules existantes
-- SELECT DISTINCT categorie FROM public.tb_vehicules;

-- Vérifier les types de courses existants
-- SELECT DISTINCT type_course FROM public.tb_missions;

-- Vérifier les combinaisons existantes dans la table des tarifs
-- SELECT categorie, type_course, prix_base FROM public.tb_tarifs ORDER BY categorie, type_course;

-- Insérer les tarifs manquants pour garantir la correspondance
INSERT INTO public.tb_tarifs (categorie, type_course, prix_base, devise) VALUES
('Économique', 'Mise à disposition (Journée)', 60.00, 'USD'),
('VIP', 'Mise à disposition (Journée)', 150.00, 'USD'),
('Bus', 'Mise à disposition (Journée)', 250.00, 'USD'),
('Économique', 'Voyage Interurbain', 40.00, 'USD'),
('VIP', 'Voyage Interurbain', 80.00, 'USD'),
('Bus', 'Voyage Interurbain', 120.00, 'USD')
ON CONFLICT (categorie, type_course) DO UPDATE
SET prix_base = EXCLUDED.prix_base,
    devise = EXCLUDED.devise;

-- Mettre à jour les catégories dans la table des véhicules pour s'assurer qu'elles correspondent aux valeurs attendues
UPDATE public.tb_vehicules 
SET categorie = 'Économique'
WHERE categorie IS NULL OR categorie = '';

-- Mettre à jour les types de courses dans la table des missions pour s'assurer qu'elles correspondent aux valeurs attendues
UPDATE public.tb_missions
SET type_course = 'Course Urbaine'
WHERE type_course IS NULL OR type_course = '';

-- Vérifier qu'il n'y a pas de valeurs NULL ou vides dans les tables critiques
-- Ces vérifications peuvent être utiles pour le débogage
-- SELECT COUNT(*) FROM public.tb_vehicules WHERE categorie IS NULL OR categorie = '';
-- SELECT COUNT(*) FROM public.tb_missions WHERE type_course IS NULL OR type_course = '';
-- SELECT COUNT(*) FROM public.tb_tarifs WHERE categorie IS NULL OR categorie = '' OR type_course IS NULL OR type_course = '';