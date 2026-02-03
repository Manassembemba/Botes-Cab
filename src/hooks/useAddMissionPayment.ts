import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AddPaymentParams = {
    missionId: number;
    amount: number;
    methodId: number;
    date?: Date;
    notes?: string;
};

export function useAddMissionPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ missionId, amount, methodId, date, notes }: AddPaymentParams) => {
            const { data, error } = await supabase.rpc('add_mission_payment', {
                p_mission_id: missionId,
                p_amount: amount,
                p_method_id: methodId,
                p_date: date?.toISOString() || new Date().toISOString(),
                p_notes: notes
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
