-- Migration: 20260203195000_fix_existing_chauffeur_status.sql
-- Description: Correction des statuts 'Disponible' incohérents pour les chauffeurs ayant des missions 'En cours'.

DO $$
BEGIN
    -- Mettre à 'Indisponible' tous les chauffeurs qui ont au moins une mission 'En cours'
    UPDATE public.tb_chauffeurs
    SET disponibilite = 'Indisponible'
    WHERE chauffeur_id IN (
        SELECT DISTINCT chauffeur_id 
        FROM public.tb_missions 
        WHERE statut_mission = 'En cours'
    );

    -- Optionnel : Mettre à 'Disponible' ceux qui n'ont PAS de mission 'En cours' (au cas où il y aurait des incohérences inverses)
    -- UPDATE public.tb_chauffeurs
    -- SET disponibilite = 'Disponible'
    -- WHERE chauffeur_id NOT IN (
    --     SELECT DISTINCT chauffeur_id 
    --     FROM public.tb_missions 
    --     WHERE statut_mission = 'En cours'
    -- );
END $$;
