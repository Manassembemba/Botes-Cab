import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TransactionCaisse = Tables<'tb_caisse'>;

export function useCaisse() {
    return useQuery({
        queryKey: ['caisse'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tb_caisse')
                .select('*')
                .order('date_transaction', { ascending: false });

            if (error) throw error;
            return data;
        },
    });
}

export function useSoldeCaisse() {
    const { data: transactions } = useCaisse();

    const soldeUSD = transactions?.filter(t => t.devise === 'USD').reduce((acc, t) => {
        return t.type === 'Entrée' ? acc + Number(t.montant) : acc - Number(t.montant);
    }, 0) || 0;

    const soldeCDF = transactions?.filter(t => t.devise === 'CDF').reduce((acc, t) => {
        return t.type === 'Entrée' ? acc + Number(t.montant) : acc - Number(t.montant);
    }, 0) || 0;

    return { soldeUSD, soldeCDF };
}
