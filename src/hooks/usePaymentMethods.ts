import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMethod {
    method_id: number;
    label: string;
    is_active: boolean;
    type?: string;
}

export function usePaymentMethods() {
    return useQuery({
        queryKey: ['paymentMethods'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tb_payment_methods')
                .select('*')
                .eq('is_active', true)
                .order('label');

            if (error) throw error;
            return data as PaymentMethod[];
        },
    });
}
