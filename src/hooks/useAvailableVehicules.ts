import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useAvailableVehiculesInRange(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['available-vehicules-range', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const { data, error } = await supabase.rpc('get_available_vehicules_in_range', {
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString()
      });

      if (error) {
        console.error('Error fetching available vehicules in range:', error);
        throw error;
      }

      return data as Tables<'tb_vehicules'>[];
    },
    enabled: !!startDate && !!endDate,
  });
}

// Garder l'ancien hook pour compatibilité
export function useAvailableVehicules() {
  return useQuery({
    queryKey: ['available-vehicules'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_vehicules_in_range', {
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3600000).toISOString()
      });
      if (error) throw error;
      return data as Tables<'tb_vehicules'>[];
    }
  });
}
