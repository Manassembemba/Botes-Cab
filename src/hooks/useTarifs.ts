import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Tarif = Tables<'tb_tarifs'>;

export function useTarifs() {
    return useQuery({
        queryKey: ['tarifs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tb_tarifs')
                .select('*');

            if (error) throw error;
            return data as Tarif[];
        },
    });
}

export function useGetTarif(categorie?: string | null, typeCourse?: string | null) {
    const { data: tarifs } = useTarifs();

    if (!categorie || !typeCourse || !tarifs) return null;

    return tarifs.find(t => t.categorie === categorie && t.type_course === typeCourse);
}

export function useUpdateTarif() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...changes }: { id: number } & Partial<Tables<'tb_tarifs'>>) => {
            const { data, error } = await supabase
                .from('tb_tarifs')
                .update(changes)
                .eq('tarif_id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tarifs'] });
        },
    });
}
