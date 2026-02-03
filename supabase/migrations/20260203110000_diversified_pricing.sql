-- Migration : Tarification Diversifiée et Catégories
-- Description : Ajout de la gestion des catégories de véhicules, types de courses et tarifs associés.

-- 1. Ajout de la catégorie aux véhicules
ALTER TABLE public.tb_vehicules 
ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT 'Économique';

-- 2. Ajout du type de course aux missions
ALTER TABLE public.tb_missions 
ADD COLUMN IF NOT EXISTS type_course TEXT DEFAULT 'Course Urbaine';

-- 3. Création de la table des tarifs
CREATE TABLE IF NOT EXISTS public.tb_tarifs (
    tarif_id SERIAL PRIMARY KEY,
    categorie TEXT NOT NULL,
    type_course TEXT NOT NULL,
    prix_base NUMERIC(15, 2) NOT NULL DEFAULT 0,
    devise TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(categorie, type_course)
);

-- 4. Insertion de quelques tarifs par défaut (exemples)
INSERT INTO public.tb_tarifs (categorie, type_course, prix_base) VALUES
('Économique', 'Transfert Aéroport', 25),
('Économique', 'Course Urbaine', 10),
('Économique', 'Mise à disposition (Journée)', 60),
('VIP', 'Transfert Aéroport', 50),
('VIP', 'Course Urbaine', 30),
('VIP', 'Mise à disposition (Journée)', 150),
('Bus', 'Transfert Aéroport', 80),
('Bus', 'Mise à disposition (Journée)', 250)
ON CONFLICT (categorie, type_course) DO UPDATE 
SET prix_base = EXCLUDED.prix_base;

-- 5. Activation RLS pour tb_tarifs
ALTER TABLE public.tb_tarifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut lire les tarifs" ON public.tb_tarifs FOR SELECT USING (true);
CREATE POLICY "Les admins peuvent modifier les tarifs" ON public.tb_tarifs FOR ALL USING (true); -- Adapté selon les besoins réels de sécurité
