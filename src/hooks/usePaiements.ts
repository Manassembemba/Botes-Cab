import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Paiement = Tables<'tb_paiements'>;
export type PaiementInsert = TablesInsert<'tb_paiements'>;
export type PaiementUpdate = TablesUpdate<'tb_paiements'>;

export function usePaiements(missionId?: number) {
    return useQuery({
        queryKey: missionId ? ['paiements', missionId] : ['paiements'],
        queryFn: async () => {
            let query = supabase.from('tb_paiements').select('*');
            if (missionId) {
                query = query.eq('mission_id', missionId);
            }
            const { data, error } = await query.order('date_paiement', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}

export function useCreatePaiement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (paiement: PaiementInsert) => {
            const { data, error } = await supabase
                .from('tb_paiements')
                .insert(paiement)
                .select()
                .single();

            if (error) throw error;

            // Logique automatique pour la caisse
            await supabase.from('tb_caisse').insert({
                type: 'Entrée',
                montant: paiement.montant,
                devise: paiement.devise || 'USD',
                source_type: 'Mission',
                source_id: paiement.mission_id,
                description: `Paiement reçu pour la mission #${paiement.mission_id}. ${paiement.notes || ''}`
            });

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['paiements'] });
            if (variables.mission_id) {
                queryClient.invalidateQueries({ queryKey: ['paiements', variables.mission_id] });
                queryClient.invalidateQueries({ queryKey: ['missions', variables.mission_id] });
            }
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
        },
    });
}

export function useDeletePaiement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            // Pour la suppression, on devrait idéalement annuler la transaction en caisse
            // mais pour l'instant simplifions
            const { error } = await supabase
                .from('tb_paiements')
                .delete()
                .eq('paiement_id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paiements'] });
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
            queryClient.invalidateQueries({ queryKey: ['missions'] });
        },
    });
}
