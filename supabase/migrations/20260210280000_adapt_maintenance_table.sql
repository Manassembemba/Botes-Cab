-- Migration: 20260210280000_adapt_maintenance_table.sql
-- Description: Adaptation de la table de maintenance à la structure existante

-- Vérifier la structure actuelle de la table
-- SELECT column_name, is_nullable, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'tb_maintenance'
-- ORDER BY ordinal_position;

-- Modifier la colonne type_travail pour autoriser les valeurs NULL
ALTER TABLE public.tb_maintenance ALTER COLUMN type_travail DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN type_travail SET DEFAULT NULL;

-- Mettre à jour les lignes existantes qui ont des valeurs NULL dans les colonnes critiques
UPDATE public.tb_maintenance 
SET 
    type_travail = COALESCE(type_travail, 'Maintenance'),
    type_intervention = COALESCE(type_intervention, 'Maintenance'),
    description = COALESCE(description, 'Description de la maintenance'),
    statut = COALESCE(statut, 'planifiee'),
    priorite = COALESCE(priorite, 'moyenne');

-- Si la colonne type_travail n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'type_travail') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN type_travail VARCHAR(255);
    END IF;
END $$;

-- Si la colonne type_intervention n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'type_intervention') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN type_intervention VARCHAR(255);
    END IF;
END $$;

-- Si la colonne description n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'description') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN description TEXT;
    END IF;
END $$;

-- Si la colonne statut n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'statut') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN statut VARCHAR(50) DEFAULT 'planifiee';
    END IF;
END $$;

-- Si la colonne priorite n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'priorite') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN priorite VARCHAR(20) DEFAULT 'moyenne';
    END IF;
END $$;

-- Ajouter les contraintes de vérification si elles n'existent pas déjà
DO $$
BEGIN
    -- Supprimer la contrainte si elle existe déjà
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_statut' AND table_name='tb_maintenance') THEN
        ALTER TABLE public.tb_maintenance DROP CONSTRAINT chk_statut;
    END IF;
    
    -- Ajouter la contrainte
    ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_statut CHECK (statut IN ('planifiee', 'en_cours', 'terminee'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Supprimer la contrainte si elle existe déjà
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_priorite' AND table_name='tb_maintenance') THEN
        ALTER TABLE public.tb_maintenance DROP CONSTRAINT chk_priorite;
    END IF;
    
    -- Ajouter la contrainte
    ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_priorite CHECK (priorite IN ('basse', 'moyenne', 'haute'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Création des indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicule ON public.tb_maintenance(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_chauffeur ON public.tb_maintenance(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date_prevue ON public.tb_maintenance(date_prevue);
CREATE INDEX IF NOT EXISTS idx_maintenance_statut ON public.tb_maintenance(statut);

-- Création du trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà, puis le recréer
DROP TRIGGER IF EXISTS update_tb_maintenance_updated_at ON public.tb_maintenance;
CREATE TRIGGER update_tb_maintenance_updated_at 
    BEFORE UPDATE ON public.tb_maintenance 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();