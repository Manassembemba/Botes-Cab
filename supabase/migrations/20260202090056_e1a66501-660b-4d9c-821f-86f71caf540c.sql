-- Create refunds table
CREATE TABLE public.tb_remboursements (
  remboursement_id SERIAL PRIMARY KEY,
  mission_id INTEGER REFERENCES public.tb_missions(mission_id) ON DELETE SET NULL,
  client_nom VARCHAR NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  motif TEXT NOT NULL,
  statut VARCHAR NOT NULL DEFAULT 'En attente',
  date_demande TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_traitement TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tb_remboursements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Utilisateurs authentifiés peuvent voir les remboursements"
ON public.tb_remboursements FOR SELECT USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des remboursements"
ON public.tb_remboursements FOR INSERT WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les remboursements"
ON public.tb_remboursements FOR UPDATE USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les remboursements"
ON public.tb_remboursements FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_tb_remboursements_updated_at
BEFORE UPDATE ON public.tb_remboursements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();