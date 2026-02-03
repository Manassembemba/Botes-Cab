import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MissionInsert } from './useMissions';

interface CreateMissionTransactionParams {
    missionData: MissionInsert;
    paymentAmount: number;
    paymentMethodId: number | null;
}

export function useCreateMissionTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ missionData, paymentAmount, paymentMethodId }: CreateMissionTransactionParams) => {
            // Préparation des données pour le RPC
            // On s'assure que les dates sont au format ISO string
            const formattedMissionData = {
                ...missionData,
                date_depart_prevue: new Date(missionData.date_depart_prevue).toISOString(),
                date_arrivee_prevue: new Date(missionData.date_arrivee_prevue).toISOString(),
            };

            const { data, error } = await supabase.rpc('create_mission_with_transaction', {
                mission_data: formattedMissionData as any, // Cast as any car Json type complexe
                payment_amount: paymentAmount,
                payment_method_id: paymentMethodId
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            queryClient.invalidateQueries({ queryKey: ['caisse'] }); // Mettre à jour la caisse aussi
        },
    });
}

export function useAddMissionPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ missionId, amount, methodId, date }: { missionId: number, amount: number, methodId: number, date?: string }) => {
            const { data, error } = await supabase.rpc('add_mission_payment', {
                p_mission_id: missionId,
                p_amount: amount,
                p_method_id: methodId,
                p_date: date || new Date().toISOString()
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
        },
    });
}
