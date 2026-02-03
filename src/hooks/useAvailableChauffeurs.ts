import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useAvailableChauffeursInRange(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['available-chauffeurs-range', startDate, endDate],
        queryFn: async () => {
            if (!startDate || !endDate) return [];

            // S'assurer que les dates sont au format ISO complèt avec fuseau horaire
            const { data, error } = await supabase.rpc('get_available_chauffeurs_in_range', {
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString()
            });

            if (error) {
                console.error('Error fetching available chauffeurs in range:', error);
                throw error;
            }

            return data as Tables<'tb_chauffeurs'>[];
        },
        enabled: !!startDate && !!endDate,
    });
}

// Garder l'ancien hook pour compatibilité si nécessaire, ou le rediriger
export function useAvailableChauffeurs() {
    // Version legacy qui ne vérifie pas les dates (ou prend "maintenant")
    // Idéalement à déprécier
    return useQuery({
        queryKey: ['available-chauffeurs'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_available_chauffeurs_in_range', {
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 3600000).toISOString() // +1h par défaut
            });
            if (error) throw error;
            return data as Tables<'tb_chauffeurs'>[];
        }
    });
}
