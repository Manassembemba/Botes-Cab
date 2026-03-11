-- Migration: 20260210360000_add_title_to_clients.sql
-- Description: Ajout du champ titre (M./Mme) à la table des clients

-- Ajouter la colonne titre à la table des clients
ALTER TABLE public.tb_clients
ADD COLUMN IF NOT EXISTS titre VARCHAR(10) DEFAULT 'M.' CHECK (titre IN ('M.', 'Mme', 'Mlle', 'Dr', 'Pr'));

-- Mettre à jour la colonne titre pour les clients existants (par défaut à 'M.')
UPDATE public.tb_clients
SET titre = 'M.'
WHERE titre IS NULL;

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN public.tb_clients.titre IS 'Titre du client (M., Mme, Mlle, Dr, Pr)';