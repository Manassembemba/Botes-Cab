import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Vehicule = Tables<'tb_vehicules'>;
export type VehiculeInsert = TablesInsert<'tb_vehicules'>;
export type VehiculeUpdate = TablesUpdate<'tb_vehicules'>;

export function useVehicules() {
  return useQuery({
    queryKey: ['vehicules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_vehicules')
        .select('*')
        .order('marque', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicule(id: number) {
  return useQuery({
    queryKey: ['vehicules', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_vehicules')
        .select('*')
        .eq('vehicule_id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVehicule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vehicule: VehiculeInsert) => {
      const { data, error } = await supabase
        .from('tb_vehicules')
        .insert(vehicule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}

export function useUpdateVehicule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...vehicule }: VehiculeUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_vehicules')
        .update(vehicule)
        .eq('vehicule_id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}

export function useDeleteVehicule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_vehicules')
        .delete()
        .eq('vehicule_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}
