-- Migration: 20260210300000_create_clients_table.sql
-- Description: Création de la table des clients et du système de détection des clients fidèles

-- Création de la table des clients
CREATE TABLE IF NOT EXISTS public.tb_clients (
    client_id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255),
    telephone VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    adresse TEXT,
    date_inscription TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    est_fidele BOOLEAN DEFAULT FALSE,
    nb_missions_total INTEGER DEFAULT 0,
    montant_total_depense NUMERIC(12,2) DEFAULT 0,
    derniere_mission_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création des indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_clients_telephone ON public.tb_clients(telephone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.tb_clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_fidele ON public.tb_clients(est_fidele);

-- Création du trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà, puis le recréer pour la table clients
DROP TRIGGER IF EXISTS update_tb_clients_updated_at ON public.tb_clients;
CREATE TRIGGER update_tb_clients_updated_at 
    BEFORE UPDATE ON public.tb_clients 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter la colonne client_id à la table des missions si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_missions' AND column_name = 'client_id') THEN
        ALTER TABLE public.tb_missions ADD COLUMN client_id INTEGER REFERENCES public.tb_clients(client_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ajouter la colonne client_id à la table des paiements si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_paiements' AND column_name = 'client_id') THEN
        ALTER TABLE public.tb_paiements ADD COLUMN client_id INTEGER REFERENCES public.tb_clients(client_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fonction pour détecter les clients fidèles
CREATE OR REPLACE FUNCTION public.check_client_fidelite(client_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    nb_missions INTEGER;
    montant_total NUMERIC;
BEGIN
    -- Calculer le nombre de missions et le montant total pour ce client
    SELECT 
        COUNT(*), 
        COALESCE(SUM(m.montant_total), 0)
    INTO nb_missions, montant_total
    FROM public.tb_missions m
    WHERE m.client_id = client_id_param AND m.statut_mission = 'Terminée';

    -- Mettre à jour les statistiques du client
    UPDATE public.tb_clients 
    SET 
        nb_missions_total = nb_missions,
        montant_total_depense = montant_total,
        derniere_mission_date = (
            SELECT MAX(date_arrivee_reelle) 
            FROM public.tb_missions 
            WHERE client_id = client_id_param AND statut_mission = 'Terminée'
        ),
        est_fidele = (nb_missions >= 10 OR montant_total >= 1000) -- Critère: 10 missions OU 1000 USD dépensés
    WHERE client_id = client_id_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer ou mettre à jour un client à partir d'une mission
CREATE OR REPLACE FUNCTION public.upsert_client_from_mission(
    p_client_nom VARCHAR(255),
    p_client_tel VARCHAR(50),
    p_client_email VARCHAR(255)
)
RETURNS INTEGER AS $$
DECLARE
    v_client_id INTEGER;
BEGIN
    -- Chercher un client existant par téléphone ou email
    SELECT client_id INTO v_client_id
    FROM public.tb_clients
    WHERE (telephone = p_client_tel OR email = p_client_email)
    AND (p_client_tel IS NOT NULL OR p_client_email IS NOT NULL)
    LIMIT 1;

    -- Si un client existe, le retourner
    IF v_client_id IS NOT NULL THEN
        RETURN v_client_id;
    END IF;

    -- Sinon, créer un nouveau client
    INSERT INTO public.tb_clients (nom, telephone, email)
    VALUES (p_client_nom, p_client_tel, p_client_email)
    RETURNING client_id INTO v_client_id;

    RETURN v_client_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour la fidélité du client après chaque mission terminée
CREATE OR REPLACE FUNCTION public.update_client_stats_after_mission()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la mission est terminée et qu'elle a un client associé
    IF NEW.statut_mission = 'Terminée' AND NEW.client_id IS NOT NULL THEN
        -- Mettre à jour les statistiques du client
        PERFORM public.check_client_fidelite(NEW.client_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table des missions
DROP TRIGGER IF EXISTS update_client_stats_on_mission_change ON public.tb_missions;
CREATE TRIGGER update_client_stats_on_mission_change
    AFTER INSERT OR UPDATE OF statut_mission ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_stats_after_mission();