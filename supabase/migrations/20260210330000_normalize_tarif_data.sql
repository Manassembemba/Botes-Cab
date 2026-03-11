-- Migration: 20260210330000_normalize_tarif_data.sql
-- Description: Normalisation des données de tarifs pour corriger les espaces et correspondances exactes

-- Créer une table temporaire pour stocker les corrections
CREATE TEMP TABLE temp_corrections AS 
SELECT DISTINCT categorie, type_course 
FROM public.tb_tarifs 
WHERE (type_course LIKE '%disposition%(%)%' AND type_course NOT LIKE '%disposition (Journée%')
   OR type_course = 'Course Aéroport'
   OR type_course = 'Voyage interurbain';

-- Corriger les espaces dans les types de courses dans la table des tarifs
UPDATE public.tb_tarifs 
SET type_course = CASE 
    WHEN type_course LIKE '%mise%disposition%(%)journee%' OR type_course LIKE '%Mise%à%disposition%(%)Journée%' THEN 'Mise à disposition (Journée)'
    WHEN type_course = 'Course Aéroport' THEN 'Transfert Aéroport'
    WHEN type_course = 'Voyage interurbain' THEN 'Voyage Interurbain'
    ELSE type_course
END
WHERE type_course IN (SELECT type_course FROM temp_corrections);

-- Standardiser les catégories de véhicules
UPDATE public.tb_tarifs 
SET categorie = CASE 
    WHEN categorie = 'économique' OR categorie = 'Economique' THEN 'Économique'
    WHEN categorie = 'vip' OR categorie = 'Vip' THEN 'VIP'
    WHEN categorie = 'bus' OR categorie = 'BUS' THEN 'Bus'
    ELSE categorie
END
WHERE categorie IN ('économique', 'Economique', 'vip', 'Vip', 'bus', 'BUS');

-- Insérer les tarifs manquants avec les bonnes orthographes
INSERT INTO public.tb_tarifs (categorie, type_course, prix_base, devise) VALUES
('Économique', 'Transfert Aéroport', 25.00, 'USD'),
('Économique', 'Course Urbaine', 10.00, 'USD'),
('VIP', 'Transfert Aéroport', 50.00, 'USD'),
('VIP', 'Course Urbaine', 30.00, 'USD'),
('VIP', 'Mise à disposition (Journée)', 150.00, 'USD'),
('Bus', 'Transfert Aéroport', 80.00, 'USD'),
('Bus', 'Mise à disposition (Journée)', 250.00, 'USD'),
('Économique', 'Voyage Interurbain', 40.00, 'USD'),
('VIP', 'Voyage Interurbain', 80.00, 'USD'),
('Bus', 'Voyage Interurbain', 120.00, 'USD')
ON CONFLICT (categorie, type_course) DO UPDATE
SET prix_base = EXCLUDED.prix_base,
    devise = EXCLUDED.devise;

-- Mettre à jour les types de courses dans la table des missions pour correspondre aux valeurs normalisées
UPDATE public.tb_missions
SET type_course = 'Mise à disposition (Journée)'
WHERE type_course LIKE '%mise%disposition%(%)journee%' OR type_course LIKE '%Mise%à%disposition%(%)Journée%';

UPDATE public.tb_missions
SET type_course = 'Transfert Aéroport'
WHERE type_course LIKE '%aeroport%' OR type_course LIKE '%aéroport%' OR type_course LIKE '%transfert%';

-- Mettre à jour les catégories dans la table des véhicules pour correspondre aux valeurs normalisées
UPDATE public.tb_vehicules
SET categorie = 'Économique'
WHERE categorie LIKE '%economique%' OR categorie LIKE '%Économique%';

UPDATE public.tb_vehicules
SET categorie = 'VIP'
WHERE categorie LIKE '%vip%' OR categorie LIKE '%VIP%';