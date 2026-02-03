import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Remboursement {
  remboursement_id: number;
  mission_id: number | null;
  client_nom: string;
  montant: number;
  motif: string;
  statut: string;
  date_demande: string;
  date_traitement: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  devise: string | null;
  mission?: {
    mission_id: number;
    lieu_depart: string;
    lieu_arrivee: string;
    date_depart_prevue: string;
  } | null;
}

export interface RemboursementFormData {
  mission_id?: number | null;
  client_nom: string;
  montant: number;
  motif: string;
  statut: string;
  date_demande: string;
  date_traitement?: string | null;
  notes?: string | null;
  devise?: string | null;
}

export function useRemboursements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: remboursements = [], isLoading, error } = useQuery({
    queryKey: ['remboursements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_remboursements')
        .select(`
          *,
          mission:tb_missions(mission_id, lieu_depart, lieu_arrivee, date_depart_prevue)
        `)
        .order('date_demande', { ascending: false });

      if (error) throw error;
      return data as Remboursement[];
    },
  });

  const createRemboursement = useMutation({
    mutationFn: async (newRemboursement: RemboursementFormData) => {
      const { data, error } = await supabase
        .from('tb_remboursements')
        .insert([newRemboursement])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remboursements'] });
      toast({
        title: 'Succès',
        description: 'Demande de remboursement créée avec succès',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la création: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateRemboursement = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<RemboursementFormData> }) => {
      const { data, error } = await supabase
        .from('tb_remboursements')
        .update(updates)
        .eq('remboursement_id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remboursements'] });
      queryClient.invalidateQueries({ queryKey: ['caisse'] });
      toast({
        title: 'Succès',
        description: 'Remboursement mis à jour avec succès',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la mise à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteRemboursement = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_remboursements')
        .delete()
        .eq('remboursement_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remboursements'] });
      toast({
        title: 'Succès',
        description: 'Remboursement supprimé avec succès',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la suppression: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Stats for reports
  const stats = {
    total: remboursements.length,
    enAttente: remboursements.filter(r => r.statut === 'En attente').length,
    approuves: remboursements.filter(r => r.statut === 'Approuvé').length,
    refuses: remboursements.filter(r => r.statut === 'Refusé').length,
    rembourses: remboursements.filter(r => r.statut === 'Remboursé').length,
    montantTotal: remboursements.reduce((sum, r) => sum + Number(r.montant), 0),
    montantApprouve: remboursements
      .filter(r => r.statut === 'Approuvé' || r.statut === 'Remboursé')
      .reduce((sum, r) => sum + Number(r.montant), 0),
  };

  return {
    remboursements,
    isLoading,
    error,
    stats,
    createRemboursement,
    updateRemboursement,
    deleteRemboursement,
  };
}
