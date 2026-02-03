import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Chauffeur = Tables<'tb_chauffeurs'>;
export type ChauffeurInsert = TablesInsert<'tb_chauffeurs'>;
export type ChauffeurUpdate = TablesUpdate<'tb_chauffeurs'>;

export function useChauffeurs() {
  return useQuery({
    queryKey: ['chauffeurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_chauffeurs')
        .select('*')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useChauffeur(id: number) {
  return useQuery({
    queryKey: ['chauffeurs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_chauffeurs')
        .select('*')
        .eq('chauffeur_id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateChauffeur() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (chauffeur: ChauffeurInsert) => {
      const { data, error } = await supabase
        .from('tb_chauffeurs')
        .insert(chauffeur)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
    },
  });
}

export function useUpdateChauffeur() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...chauffeur }: ChauffeurUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_chauffeurs')
        .update(chauffeur)
        .eq('chauffeur_id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
    },
  });
}

export function useDeleteChauffeur() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_chauffeurs')
        .delete()
        .eq('chauffeur_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
    },
  });
}
