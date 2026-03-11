import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilityCheckParams {
  startDate: string;
  endDate: string;
  excludeMissionId?: number;
}

export function useVehiculeAvailability(vehiculeId: number | null, params: AvailabilityCheckParams) {
  const { startDate, endDate } = params;
  
  return useQuery({
    queryKey: ['vehicule-availability', vehiculeId, startDate, endDate, params.excludeMissionId],
    queryFn: async () => {
      if (!vehiculeId) return { available: true, conflicts: [] };

      const { data, error } = await supabase
        .from('tb_missions')
        .select(`
          mission_id,
          lieu_depart,
          lieu_arrivee,
          date_depart_prevue,
          date_arrivee_prevue,
          statut_mission
        `)
        .eq('vehicule_id', vehiculeId)
        .neq('statut_mission', 'Annulée')
        .lt('date_depart_prevue', endDate)
        .gt('date_arrivee_prevue', startDate)
        .neq('mission_id', params.excludeMissionId || -1);

      if (error) throw error;

      const conflicts = data || [];
      return {
        available: conflicts.length === 0,
        conflicts
      };
    },
    enabled: !!vehiculeId && !!startDate && !!endDate,
  });
}

interface ChauffeurAvailabilityCheckParams {
  startDate: string;
  endDate: string;
  excludeMissionId?: number;
}

export function useChauffeurAvailability(chauffeurId: number | null, params: ChauffeurAvailabilityCheckParams) {
  const { startDate, endDate } = params;
  
  return useQuery({
    queryKey: ['chauffeur-availability', chauffeurId, startDate, endDate, params.excludeMissionId],
    queryFn: async () => {
      if (!chauffeurId) return { available: true, conflicts: [] };

      const { data, error } = await supabase
        .from('tb_missions')
        .select(`
          mission_id,
          lieu_depart,
          lieu_arrivee,
          date_depart_prevue,
          date_arrivee_prevue,
          statut_mission
        `)
        .eq('chauffeur_id', chauffeurId)
        .neq('statut_mission', 'Annulée')
        .lt('date_depart_prevue', endDate)
        .gt('date_arrivee_prevue', startDate)
        .neq('mission_id', params.excludeMissionId || -1);

      if (error) throw error;

      const conflicts = data || [];
      return {
        available: conflicts.length === 0,
        conflicts
      };
    },
    enabled: !!chauffeurId && !!startDate && !!endDate,
  });
}