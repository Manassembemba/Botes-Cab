import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Mission = Tables<'tb_missions'>;
export type MissionInsert = TablesInsert<'tb_missions'>;
export type MissionUpdate = TablesUpdate<'tb_missions'>;

// Extended mission with joined data
export type MissionWithDetails = Mission & {
  chauffeur?: Tables<'tb_chauffeurs'> | null;
  vehicule?: Tables<'tb_vehicules'> | null;
};

export function useMissions() {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_missions')
        .select(`
          *,
          chauffeur:tb_chauffeurs(*),
          vehicule:tb_vehicules(*)
        `)
        .order('date_depart_prevue', { ascending: false });
      
      if (error) throw error;
      return data as MissionWithDetails[];
    },
  });
}

export function useMission(id: number) {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_missions')
        .select(`
          *,
          chauffeur:tb_chauffeurs(*),
          vehicule:tb_vehicules(*)
        `)
        .eq('mission_id', id)
        .single();
      
      if (error) throw error;
      return data as MissionWithDetails;
    },
    enabled: !!id,
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mission: MissionInsert) => {
      const { data, error } = await supabase
        .from('tb_missions')
        .insert(mission)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...mission }: MissionUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('tb_missions')
        .update(mission)
        .eq('mission_id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tb_missions')
        .delete()
        .eq('mission_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}
