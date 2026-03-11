-- Migration: 20260210270000_fix_maintenance_constraints.sql
-- Description: Correction des contraintes NOT NULL dans la table de maintenance

-- Modifier les colonnes pour enlever les contraintes NOT NULL là où nécessaire
ALTER TABLE public.tb_maintenance ALTER COLUMN type_intervention DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN date_debut DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN date_fin DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN statut DROP NOT NULL;
ALTER TABLE public.tb_maintenance ALTER COLUMN priorite DROP NOT NULL;

-- Définir des valeurs par défaut pour les colonnes qui doivent avoir une valeur
ALTER TABLE public.tb_maintenance ALTER COLUMN type_intervention SET DEFAULT 'Maintenance';
ALTER TABLE public.tb_maintenance ALTER COLUMN description SET DEFAULT 'Description de la maintenance';
ALTER TABLE public.tb_maintenance ALTER COLUMN statut SET DEFAULT 'planifiee';
ALTER TABLE public.tb_maintenance ALTER COLUMN priorite SET DEFAULT 'moyenne';

-- Mettre à jour les lignes existantes qui ont des valeurs NULL
UPDATE public.tb_maintenance 
SET 
    type_intervention = COALESCE(type_intervention, 'Maintenance'),
    description = COALESCE(description, 'Description de la maintenance'),
    statut = COALESCE(statut, 'planifiee'),
    priorite = COALESCE(priorite, 'moyenne');

-- Ajouter les contraintes de vérification
ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_statut CHECK (statut IN ('planifiee', 'en_cours', 'terminee'));
ALTER TABLE public.tb_maintenance ADD CONSTRAINT chk_priorite CHECK (priorite IN ('basse', 'moyenne', 'haute'));

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

