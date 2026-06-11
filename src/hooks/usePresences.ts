import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface Presence {
  presence_id?: number;
  chauffeur_id: number;
  date_presence: string;
  est_present: boolean;
  en_course: boolean;
  notes?: string;
}

export function usePresences(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['presences', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_presences_chauffeurs')
        .select('*')
        .eq('date_presence', dateStr);

      if (error) throw error;
      return data as Presence[];
    },
  });
}

export function useMonthlyPresences(year: number, month: number) {
  const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['presences', 'monthly', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_presences_chauffeurs')
        .select('*')
        .gte('date_presence', startDate)
        .lte('date_presence', endDate);

      if (error) throw error;
      return data as Presence[];
    },
  });
}

export function useUpsertPresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presence: Omit<Presence, 'presence_id'>) => {
      const { data, error } = await supabase
        .from('tb_presences_chauffeurs')
        .upsert(presence, { 
          onConflict: 'chauffeur_id,date_presence' 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presences'] });
    },
  });
}
