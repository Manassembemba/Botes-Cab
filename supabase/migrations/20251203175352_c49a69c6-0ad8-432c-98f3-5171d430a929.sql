-- Création de la table des chauffeurs
CREATE TABLE public.tb_chauffeurs (
    chauffeur_id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    tel VARCHAR(15),
    permis_exp_date DATE NOT NULL,
    disponibilite VARCHAR(20) DEFAULT 'Disponible' NOT NULL,
    date_embauche DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de Row Level Security
ALTER TABLE public.tb_chauffeurs ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "Les utilisateurs authentifiés peuvent voir les chauffeurs"
ON public.tb_chauffeurs
FOR SELECT
TO authenticated
USING (true);

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Les utilisateurs authentifiés peuvent ajouter des chauffeurs"
ON public.tb_chauffeurs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les chauffeurs"
ON public.tb_chauffeurs
FOR UPDATE
TO authenticated
USING (true);

-- Politique de suppression pour les utilisateurs authentifiés
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les chauffeurs"
ON public.tb_chauffeurs
FOR DELETE
TO authenticated
USING (true);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la mise à jour automatique de updated_at
CREATE TRIGGER update_tb_chauffeurs_updated_at
    BEFORE UPDATE ON public.tb_chauffeurs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();