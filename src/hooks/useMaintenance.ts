import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Maintenance = Tables<'tb_maintenance'>;
export type MaintenanceInsert = TablesInsert<'tb_maintenance'>;
export type MaintenanceUpdate = TablesUpdate<'tb_maintenance'>;

// Extended maintenance with joined data
export type MaintenanceWithDetails = Maintenance & {
  vehicule?: Tables<'tb_vehicules'> | null;
  chauffeur?: Tables<'tb_chauffeurs'> | null;
};

export function useMaintenance() {
  return useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_maintenance')
        .select(`
          *,
          vehicule:tb_vehicules(*),
          chauffeur:tb_chauffeurs(*)
        `)
        .order('date_prevue', { ascending: false });

      if (error) throw error;
      return data as MaintenanceWithDetails[];
    },
  });
}

export function useMaintenanceById(id: number) {
  return useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_maintenance')
        .select(`
          *,
          vehicule:tb_vehicules(*),
          chauffeur:tb_chauffeurs(*)
        `)
        .eq('maintenance_id', id)
        .single();

      if (error) throw error;
      return data as MaintenanceWithDetails;
    },
    enabled: !!id,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenance: MaintenanceInsert) => {
      const { data, error } = await supabase
        .from('tb_maintenance')
        .insert(maintenance)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...maintenance }: MaintenanceUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_maintenance')
        .update(maintenance)
        .eq('maintenance_id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_maintenance')
        .delete()
        .eq('maintenance_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
}