import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Client = Tables<'tb_clients'>;
export type ClientInsert = TablesInsert<'tb_clients'>;
export type ClientUpdate = TablesUpdate<'tb_clients'>;

// Extended client with joined data
export type ClientWithStats = Client & {
  nb_missions_total: number;
  montant_total_depense: number;
  derniere_mission_date: string | null;
};

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_clients')
        .select(`
          client_id,
          nom,
          prenom,
          telephone,
          adresse,
          titre,
          date_inscription,
          est_fidele,
          nb_missions_total,
          montant_total_depense,
          derniere_mission_date,
          created_at,
          updated_at
        `)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      return data as ClientWithStats[];
    },
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_clients')
        .select(`
          client_id,
          nom,
          prenom,
          telephone,
          adresse,
          titre,
          date_inscription,
          est_fidele,
          nb_missions_total,
          montant_total_depense,
          derniere_mission_date,
          created_at,
          updated_at
        `)
        .eq('client_id', id)
        .single();

      if (error) throw error;
      return data as ClientWithStats;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('tb_clients')
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...client }: ClientUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_clients')
        .update(client)
        .eq('client_id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_clients')
        .delete()
        .eq('client_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useClientHistory(clientId: number) {
  return useQuery({
    queryKey: ['client-history', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_historique_clients')
        .select(`
          *,
          mission:tb_missions!inner(lieu_depart, lieu_arrivee, date_depart_prevue, date_arrivee_prevue, statut_mission, montant_total, devise)
        `)
        .eq('client_id', clientId)
        .order('date_mission', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useFideliteClients() {
  return useQuery({
    queryKey: ['fidelite-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_clients')
        .select(`
          client_id,
          nom,
          prenom,
          telephone,
          adresse,
          titre,
          date_inscription,
          est_fidele,
          nb_missions_total,
          montant_total_depense,
          derniere_mission_date,
          created_at,
          updated_at
        `)
        .eq('est_fidele', true)
        .order('montant_total_depense', { ascending: false });

      if (error) throw error;
      return data as ClientWithStats[];
    },
  });
}