-- Migration : Cardinalité stricte et synchronisation des statuts
-- Description : Garantir qu'un chauffeur et un véhicule ne peuvent avoir qu'une seule mission active à la fois

-- 1. Fonction pour vérifier la disponibilité des ressources
CREATE OR REPLACE FUNCTION public.check_resource_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    chauffeur_busy BOOLEAN;
    vehicule_busy BOOLEAN;
    existing_mission_id INTEGER;
BEGIN
    -- Vérifier si le chauffeur a déjà une mission active (Planifiée ou En cours)
    SELECT EXISTS (
        SELECT 1 
        FROM public.tb_missions 
        WHERE chauffeur_id = NEW.chauffeur_id 
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)  -- Exclure la mission actuelle en cas d'UPDATE
    ) INTO chauffeur_busy;

    IF chauffeur_busy THEN
        SELECT mission_id INTO existing_mission_id
        FROM public.tb_missions 
        WHERE chauffeur_id = NEW.chauffeur_id 
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)
        LIMIT 1;
        
        RAISE EXCEPTION 'Le chauffeur (ID: %) est déjà assigné à une mission active (Mission ID: %). Veuillez terminer ou annuler cette mission avant d''en créer une nouvelle.', 
            NEW.chauffeur_id, existing_mission_id
        USING ERRCODE = 'P0001';
    END IF;

    -- Vérifier si le véhicule a déjà une mission active
    SELECT EXISTS (
        SELECT 1 
        FROM public.tb_missions 
        WHERE vehicule_id = NEW.vehicule_id 
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)
    ) INTO vehicule_busy;

    IF vehicule_busy THEN
        SELECT mission_id INTO existing_mission_id
        FROM public.tb_missions 
        WHERE vehicule_id = NEW.vehicule_id 
          AND statut_mission IN ('Planifiée', 'En cours')
          AND mission_id != COALESCE(NEW.mission_id, -1)
        LIMIT 1;
        
        RAISE EXCEPTION 'Le véhicule (ID: %) est déjà assigné à une mission active (Mission ID: %). Veuillez terminer ou annuler cette mission avant d''en créer une nouvelle.', 
            NEW.vehicule_id, existing_mission_id
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Créer le trigger pour vérifier la disponibilité avant insertion/modification
DROP TRIGGER IF EXISTS trigger_check_resource_availability ON public.tb_missions;
CREATE TRIGGER trigger_check_resource_availability
    BEFORE INSERT OR UPDATE OF chauffeur_id, vehicule_id, statut_mission
    ON public.tb_missions
    FOR EACH ROW
    WHEN (NEW.statut_mission IN ('Planifiée', 'En cours'))
    EXECUTE FUNCTION public.check_resource_availability();

-- 3. Fonction pour synchroniser automatiquement les statuts des ressources
CREATE OR REPLACE FUNCTION public.sync_resource_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cas 1: Mission passe à "En cours" → Marquer les ressources comme occupées
    IF NEW.statut_mission = 'En cours' AND (OLD.statut_mission IS NULL OR OLD.statut_mission != 'En cours') THEN
        -- Mettre le véhicule en "En mission"
        UPDATE public.tb_vehicules
        SET statut = 'En mission',
            updated_at = NOW()
        WHERE vehicule_id = NEW.vehicule_id;

        -- Mettre le chauffeur en "Indisponible"
        UPDATE public.tb_chauffeurs
        SET disponibilite = 'Indisponible',
            updated_at = NOW()
        WHERE chauffeur_id = NEW.chauffeur_id;

        RAISE NOTICE 'Mission % démarrée: Véhicule % → En mission, Chauffeur % → Indisponible', 
            NEW.mission_id, NEW.vehicule_id, NEW.chauffeur_id;
    END IF;

    -- Cas 2: Mission passe à "Terminée" ou "Annulée" → Libérer les ressources
    IF NEW.statut_mission IN ('Terminée', 'Annulée') AND 
       (OLD.statut_mission IS NULL OR OLD.statut_mission NOT IN ('Terminée', 'Annulée')) THEN
        
        -- Libérer le véhicule uniquement s'il n'a pas d'autre mission active
        IF NOT EXISTS (
            SELECT 1 
            FROM public.tb_missions 
            WHERE vehicule_id = NEW.vehicule_id 
              AND statut_mission IN ('Planifiée', 'En cours')
              AND mission_id != NEW.mission_id
        ) THEN
            UPDATE public.tb_vehicules
            SET statut = 'Libre',
                updated_at = NOW()
            WHERE vehicule_id = NEW.vehicule_id;
        END IF;

        -- Libérer le chauffeur uniquement s'il n'a pas d'autre mission active
        IF NOT EXISTS (
            SELECT 1 
            FROM public.tb_missions 
            WHERE chauffeur_id = NEW.chauffeur_id 
              AND statut_mission IN ('Planifiée', 'En cours')
              AND mission_id != NEW.mission_id
        ) THEN
            UPDATE public.tb_chauffeurs
            SET disponibilite = 'Disponible',
                updated_at = NOW()
            WHERE chauffeur_id = NEW.chauffeur_id;
        END IF;

        RAISE NOTICE 'Mission % terminée/annulée: Ressources libérées si disponibles', NEW.mission_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Créer le trigger pour synchroniser les statuts après modification
DROP TRIGGER IF EXISTS trigger_sync_resource_status ON public.tb_missions;
CREATE TRIGGER trigger_sync_resource_status
    AFTER INSERT OR UPDATE OF statut_mission
    ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_resource_status();

-- 5. Fonction utilitaire pour obtenir les véhicules disponibles
CREATE OR REPLACE FUNCTION public.get_available_vehicules()
RETURNS TABLE (
    vehicule_id INTEGER,
    immatriculation TEXT,
    marque TEXT,
    modele TEXT,
    categorie TEXT,
    statut TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT v.vehicule_id, v.immatriculation, v.marque, v.modele, v.categorie, v.statut
    FROM public.tb_vehicules v
    WHERE v.statut = 'Libre'
      AND NOT EXISTS (
          SELECT 1 
          FROM public.tb_missions m 
          WHERE m.vehicule_id = v.vehicule_id 
            AND m.statut_mission IN ('Planifiée', 'En cours')
      )
    ORDER BY v.immatriculation;
$$;

-- 6. Fonction utilitaire pour obtenir les chauffeurs disponibles
CREATE OR REPLACE FUNCTION public.get_available_chauffeurs()
RETURNS TABLE (
    chauffeur_id INTEGER,
    nom TEXT,
    prenom TEXT,
    tel TEXT,
    disponibilite TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT c.chauffeur_id, c.nom, c.prenom, c.tel, c.disponibilite
    FROM public.tb_chauffeurs c
    WHERE c.disponibilite = 'Disponible'
      AND NOT EXISTS (
          SELECT 1 
          FROM public.tb_missions m 
          WHERE m.chauffeur_id = c.chauffeur_id 
            AND m.statut_mission IN ('Planifiée', 'En cours')
      )
    ORDER BY c.nom, c.prenom;
$$;

-- 7. Commentaires pour documentation
COMMENT ON FUNCTION public.check_resource_availability() IS 'Vérifie qu''un chauffeur et un véhicule ne sont pas déjà assignés à une mission active';
COMMENT ON FUNCTION public.sync_resource_status() IS 'Synchronise automatiquement les statuts des véhicules et chauffeurs selon l''état des missions';
COMMENT ON FUNCTION public.get_available_vehicules() IS 'Retourne la liste des véhicules réellement disponibles (sans mission active)';
COMMENT ON FUNCTION public.get_available_chauffeurs() IS 'Retourne la liste des chauffeurs réellement disponibles (sans mission active)';
