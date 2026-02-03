import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Depense = Tables<'tb_depenses'>;
export type DepenseInsert = TablesInsert<'tb_depenses'>;
export type DepenseUpdate = TablesUpdate<'tb_depenses'>;

export function useDepenses() {
    return useQuery({
        queryKey: ['depenses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tb_depenses')
                .select(`
          *,
          vehicule:tb_vehicules(marque, modele, immatriculation),
          chauffeur:tb_chauffeurs(nom, prenom)
        `)
                .order('date_depense', { ascending: false });

            if (error) throw error;
            return data;
        },
    });
}

export function useCreateDepense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (depense: DepenseInsert) => {
            const { data, error } = await supabase
                .from('tb_depenses')
                .insert(depense)
                .select()
                .single();

            if (error) throw error;

            // Logique automatique pour la caisse
            await supabase.from('tb_caisse').insert({
                type: 'Sortie',
                montant: depense.montant,
                devise: depense.devise || 'USD',
                source_type: 'Depense',
                source_id: data.depense_id,
                description: `Dépense : ${depense.categorie} - ${depense.description || ''}`
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['depenses'] });
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
        },
    });
}

export function useDeleteDepense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('tb_depenses')
                .delete()
                .eq('depense_id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['depenses'] });
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
        },
    });
}
