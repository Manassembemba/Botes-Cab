-- Migration: 20260210260000_create_maintenance_table.sql
-- Description: Création de la table de maintenance

-- Création de la table tb_maintenance si elle n'existe pas
DO $$
BEGIN
    -- Vérifier si la table existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tb_maintenance') THEN
        CREATE TABLE public.tb_maintenance (
            maintenance_id SERIAL PRIMARY KEY,
            vehicule_id INTEGER REFERENCES public.tb_vehicules(vehicule_id) ON DELETE CASCADE,
            chauffeur_id INTEGER REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE SET NULL,
            type_intervention VARCHAR(255),
            description TEXT,
            cout_estime NUMERIC(12,2),
            date_prevue TIMESTAMP WITH TIME ZONE,
            date_debut TIMESTAMP WITH TIME ZONE,
            date_fin TIMESTAMP WITH TIME ZONE,
            statut VARCHAR(50) DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee')),
            priorite VARCHAR(20) DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute')),
            fournisseur VARCHAR(255),
            facture_numero VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Si la table existe, ajouter les colonnes manquantes
        -- Ajouter la colonne vehicule_id si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'vehicule_id') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN vehicule_id INTEGER REFERENCES public.tb_vehicules(vehicule_id) ON DELETE CASCADE;
        END IF;
        
        -- Ajouter la colonne chauffeur_id si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'chauffeur_id') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN chauffeur_id INTEGER REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE SET NULL;
        END IF;
        
        -- Ajouter les autres colonnes si elles n'existent pas
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'type_intervention') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN type_intervention VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'description') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN description TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'cout_estime') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN cout_estime NUMERIC(12,2);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'date_prevue') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN date_prevue TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'date_debut') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN date_debut TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'date_fin') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN date_fin TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'statut') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN statut VARCHAR(50) DEFAULT 'planifiee';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'priorite') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN priorite VARCHAR(20) DEFAULT 'moyenne';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'fournisseur') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN fournisseur VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'facture_numero') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN facture_numero VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'notes') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN notes TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'created_at') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_maintenance' AND column_name = 'updated_at') THEN
            ALTER TABLE public.tb_maintenance ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
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