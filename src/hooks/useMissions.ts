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
      // 1. Créer la mission
      const { data: newMission, error: missionError } = await supabase
        .from('tb_missions')
        .insert(mission)
        .select()
        .single();

      if (missionError) throw missionError;

      // 2. Si un acompte est défini, créer le paiement correspondant
      if (mission.acompte && mission.acompte > 0) {
        const { error: paymentError } = await supabase
          .from('tb_paiements')
          .insert({
            mission_id: newMission.mission_id,
            montant: mission.acompte,
            devise: mission.devise || 'USD',
            methode_paiement: 'Cash', // Par défaut pour le moment
            notes: 'Acompte initial à la création',
            date_paiement: new Date().toISOString()
          });

        if (paymentError) {
          console.error("Erreur lors de la création du paiement initial:", paymentError);
          // On ne bloque pas la création de la mission, mais on log l'erreur
        }
      }

      return newMission;
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
