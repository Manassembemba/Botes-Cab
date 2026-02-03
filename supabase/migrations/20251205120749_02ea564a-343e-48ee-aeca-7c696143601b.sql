-- Table : tb_vehicules (Flotte)
CREATE TABLE public.tb_vehicules (
    vehicule_id SERIAL PRIMARY KEY,
    immatriculation VARCHAR(15) UNIQUE NOT NULL,
    marque VARCHAR(50) NOT NULL,
    modele VARCHAR(50) NOT NULL,
    annee_achat SMALLINT,
    kilometrage_actuel INT DEFAULT 0 NOT NULL,
    statut VARCHAR(20) DEFAULT 'Libre' NOT NULL,
    date_prochaine_revision DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tb_vehicules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent voir les véhicules"
ON public.tb_vehicules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des véhicules"
ON public.tb_vehicules FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les véhicules"
ON public.tb_vehicules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les véhicules"
ON public.tb_vehicules FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_tb_vehicules_updated_at
    BEFORE UPDATE ON public.tb_vehicules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Table : tb_missions (Planification)
CREATE TABLE public.tb_missions (
    mission_id SERIAL PRIMARY KEY,
    chauffeur_id INT NOT NULL REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    vehicule_id INT NOT NULL REFERENCES public.tb_vehicules(vehicule_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    client_nom VARCHAR(100),
    lieu_depart VARCHAR(255) NOT NULL,
    lieu_arrivee VARCHAR(255) NOT NULL,
    date_depart_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
    date_arrivee_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
    date_depart_reelle TIMESTAMP WITH TIME ZONE,
    date_arrivee_reelle TIMESTAMP WITH TIME ZONE,
    statut_mission VARCHAR(20) DEFAULT 'Planifiée' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tb_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent voir les missions"
ON public.tb_missions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des missions"
ON public.tb_missions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les missions"
ON public.tb_missions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les missions"
ON public.tb_missions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_tb_missions_updated_at
    BEFORE UPDATE ON public.tb_missions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Table : tb_maintenance (Coûts et Opérations)
CREATE TABLE public.tb_maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    vehicule_id INT NOT NULL REFERENCES public.tb_vehicules(vehicule_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    type_travail VARCHAR(50) NOT NULL,
    description_travaux TEXT,
    cout_total DECIMAL(10, 2) NOT NULL,
    kilometrage_maintenance INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tb_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent voir les maintenances"
ON public.tb_maintenance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des maintenances"
ON public.tb_maintenance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les maintenances"
ON public.tb_maintenance FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les maintenances"
ON public.tb_maintenance FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_tb_maintenance_updated_at
    BEFORE UPDATE ON public.tb_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Table : tb_journal_bord (Traçabilité Chauffeur)
CREATE TABLE public.tb_journal_bord (
    journal_id SERIAL PRIMARY KEY,
    vehicule_id INT NOT NULL REFERENCES public.tb_vehicules(vehicule_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    chauffeur_id INT NOT NULL REFERENCES public.tb_chauffeurs(chauffeur_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    mission_id INT REFERENCES public.tb_missions(mission_id) ON DELETE SET NULL ON UPDATE CASCADE,
    date_heure TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    type_evenement VARCHAR(50) NOT NULL,
    kilometrage_releve INT NOT NULL,
    montant_carburant DECIMAL(6, 2),
    litres_carburant DECIMAL(5, 2),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tb_journal_bord ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent voir le journal"
ON public.tb_journal_bord FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent ajouter au journal"
ON public.tb_journal_bord FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier le journal"
ON public.tb_journal_bord FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer du journal"
ON public.tb_journal_bord FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_tb_journal_bord_updated_at
    BEFORE UPDATE ON public.tb_journal_bord
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();