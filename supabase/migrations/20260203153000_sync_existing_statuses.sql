-- Script de synchronisation des statuts pour les missions existantes
-- À exécuter une seule fois après l'application des migrations

-- 1. Mettre à jour les statuts des véhicules en mission
UPDATE public.tb_vehicules v
SET statut = 'En mission',
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM public.tb_missions m 
    WHERE m.vehicule_id = v.vehicule_id 
      AND m.statut_mission IN ('Planifiée', 'En cours')
)
AND v.statut != 'En mission';

-- 2. Mettre à jour les statuts des chauffeurs en mission
UPDATE public.tb_chauffeurs c
SET disponibilite = 'Indisponible',
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM public.tb_missions m 
    WHERE m.chauffeur_id = c.chauffeur_id 
      AND m.statut_mission IN ('Planifiée', 'En cours')
)
AND c.disponibilite != 'Indisponible';

-- 3. Libérer les véhicules sans mission active
UPDATE public.tb_vehicules v
SET statut = 'Libre',
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.tb_missions m 
    WHERE m.vehicule_id = v.vehicule_id 
      AND m.statut_mission IN ('Planifiée', 'En cours')
)
AND v.statut = 'En mission';

-- 4. Libérer les chauffeurs sans mission active
UPDATE public.tb_chauffeurs c
SET disponibilite = 'Disponible',
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.tb_missions m 
    WHERE m.chauffeur_id = c.chauffeur_id 
      AND m.statut_mission IN ('Planifiée', 'En cours')
)
AND c.disponibilite = 'Indisponible';

-- 5. Afficher un résumé des changements
SELECT 
    'Véhicules en mission' as type,
    COUNT(*) as nombre
FROM public.tb_vehicules 
WHERE statut = 'En mission'

UNION ALL

SELECT 
    'Chauffeurs indisponibles' as type,
    COUNT(*) as nombre
FROM public.tb_chauffeurs 
WHERE disponibilite = 'Indisponible'

UNION ALL

SELECT 
    'Missions actives' as type,
    COUNT(*) as nombre
FROM public.tb_missions 
WHERE statut_mission IN ('Planifiée', 'En cours');
