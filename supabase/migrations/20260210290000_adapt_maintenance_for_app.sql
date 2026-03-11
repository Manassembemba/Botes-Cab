-- Migration: 20260210290000_adapt_maintenance_for_app.sql
-- Description: Adapter la table de maintenance pour l'application frontend

-- Modifier les contraintes NOT NULL pour permettre une utilisation plus flexible
ALTER TABLE public.tb_maintenance ALTER COLUMN date_debut DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN cout_total DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN kilometrage_maintenance DROP NOT NULL;

-- Définir des valeurs par défaut pour les colonnes critiques
ALTER TABLE public.tb_maintenance ALTER COLUMN type_travail SET DEFAULT 'Maintenance';
ALTER TABLE public.tb_maintenance ALTER COLUMN date_debut SET DEFAULT NOW();
ALTER TABLE public.tb_maintenance ALTER COLUMN cout_total SET DEFAULT 0;
ALTER TABLE public.tb_maintenance ALTER COLUMN kilometrage_maintenance SET DEFAULT 0;

-- Renommer certaines colonnes pour correspondre à notre modèle d'application
-- Si les colonnes de notre modèle n'existent pas, les ajouter
DO $$
BEGIN
    -- Vérifier si la colonne statut existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'statut') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN statut VARCHAR(50) DEFAULT 'planifiee';
    END IF;
    
    -- Vérifier si la colonne priorite existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'priorite') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN priorite VARCHAR(20) DEFAULT 'moyenne';
    END IF;
    
    -- Vérifier si la colonne description existe, sinon l'ajouter (en plus de description_travaux)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'description') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN description TEXT;
    END IF;
    
    -- Vérifier si la colonne type_intervention existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'type_intervention') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN type_intervention VARCHAR(255);
    END IF;
    
    -- Vérifier si la colonne date_prevue existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'date_prevue') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN date_prevue TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Vérifier si la colonne chauffeur_id existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'chauffeur_id') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN chauffeur_id INTEGER REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE SET NULL;
    END IF;
    
    -- Vérifier si la colonne fournisseur existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'fournisseur') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN fournisseur VARCHAR(255);
    END IF;
    
    -- Vérifier si la colonne facture_numero existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'facture_numero') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN facture_numero VARCHAR(100);
    END IF;
    
    -- Vérifier si la colonne notes existe, sinon l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'notes') THEN
        ALTER TABLE public.tb_maintenance ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Mettre à jour les colonnes existantes pour correspondre à nos besoins
UPDATE public.tb_maintenance 
SET 
    type_intervention = COALESCE(type_intervention, type_travail),
    description = COALESCE(description, description_travaux),
    statut = COALESCE(statut, 'planifiee'),
    priorite = COALESCE(priorite, 'moyenne'),
    date_prevue = COALESCE(date_prevue, date_debut::TIMESTAMP)
WHERE TRUE;

-- Ajouter les contraintes de vérification
DO $$
BEGIN
    -- Supprimer les contraintes si elles existent déjà
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_statut_maintenance' AND table_name='tb_maintenance') THEN
        ALTER TABLE public.tb_maintenance DROP CONSTRAINT chk_statut_maintenance;
    END IF;
    
    -- Ajouter la contrainte
    ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_statut_maintenance CHECK (statut IN ('planifiee', 'en_cours', 'terminee'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Supprimer les contraintes si elles existent déjà
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_priorite_maintenance' AND table_name='tb_maintenance') THEN
        ALTER TABLE public.tb_maintenance DROP CONSTRAINT chk_priorite_maintenance;
    END IF;
    
    -- Ajouter la contrainte
    ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_priorite_maintenance CHECK (priorite IN ('basse', 'moyenne', 'haute'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Créer les indexes nécessaires
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicule ON public.tb_maintenance(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_chauffeur ON public.tb_maintenance(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date_prevue ON public.tb_maintenance(date_prevue);
CREATE INDEX IF NOT EXISTS idx_maintenance_statut ON public.tb_maintenance(statut);