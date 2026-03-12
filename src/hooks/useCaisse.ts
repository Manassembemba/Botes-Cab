import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TransactionCaisse = Tables<'tb_caisse'>;

export type TransactionWithDetails = TransactionCaisse & {
    mission_solde?: number;
    mission_total?: number;
    mission_reference?: string;
    vehicule_immatriculation?: string;
    vehicule_marque_modele?: string;
    chauffeur_nom?: string;
};

export function useCaisse() {
    return useQuery({
        queryKey: ['caisse'],
        queryFn: async () => {
            // 1. Récupérer les transactions
            const { data: transactions, error } = await supabase
                .from('tb_caisse')
                .select('*')
                .order('date_transaction', { ascending: false });

            if (error) throw error;
            if (!transactions) return [];

            // 2. Identifier les IDs de paiements liés
            const paiementIds = transactions
                .filter(t => (t.source_type === 'Paiement' || t.source_type === 'paiement') && t.source_id)
                .map(t => t.source_id);

            // 3. Identifier les IDs de missions liées directement (si existant)
            const directMissionIds = transactions
                .filter(t => (t.source_type === 'Mission' || t.source_type === 'mission') && t.source_id)
                .map(t => t.source_id);

            let missionIdsToCheck = new Set<number>(directMissionIds as number[]);
            const paiementIdToMissionId = new Map<number, number>();

            // 4. Si on a des paiements, récupérer leur mission_id
            if (paiementIds.length > 0) {
                const { data: paiements, error: paiementsError } = await supabase
                    .from('tb_paiements')
                    .select('paiement_id, mission_id')
                    .in('paiement_id', paiementIds);

                if (!paiementsError && paiements) {
                    paiements.forEach(p => {
                        if (p.mission_id) {
                            paiementIdToMissionId.set(p.paiement_id, p.mission_id);
                            missionIdsToCheck.add(p.mission_id);
                        }
                    });
                }
            }

            if (missionIdsToCheck.size === 0) return transactions as TransactionWithDetails[];

            // 5. Récupérer les infos de ces missions (avec véhicules et chauffeurs)
            const { data: missions, error: missionsError } = await supabase
                .from('tb_missions')
                .select(`
                    mission_id, 
                    solde, 
                    montant_total, 
                    type_course,
                    vehicule_id,
                    chauffeur_id,
                    vehicule:tb_vehicules(immatriculation, marque, modele),
                    chauffeur:tb_chauffeurs(nom, prenom)
                `)
                .in('mission_id', Array.from(missionIdsToCheck));

            if (missionsError) {
                console.error("Erreur lors de la récupération des détails missions:", missionsError);
                return transactions as TransactionWithDetails[];
            }

            // 6. Récupérer les véhicules pour les dépenses directes
            const depenseIds = transactions
                .filter(t => (t.source_type === 'Depense' || t.source_type === 'depense') && t.source_id)
                .map(t => t.source_id);

            let depensesVehiculesMap = new Map<number, { immatriculation: string; marque_modele: string; chauffeur_nom?: string }>();

            if (depenseIds.length > 0) {
                const { data: depenses, error: depensesError } = await supabase
                    .from('tb_depenses')
                    .select(`
                        depense_id,
                        vehicule_id,
                        chauffeur_id,
                        vehicule:tb_vehicules(immatriculation, marque, modele),
                        chauffeur:tb_chauffeurs(nom, prenom)
                    `)
                    .in('depense_id', depenseIds);

                if (!depensesError && depenses) {
                    depenses.forEach(d => {
                        depensesVehiculesMap.set(d.depense_id, {
                            immatriculation: d.vehicule?.immatriculation || '',
                            marque_modele: d.vehicule ? `${d.vehicule.marque} ${d.vehicule.modele}` : '',
                            chauffeur_nom: d.chauffeur ? `${d.chauffeur.prenom} ${d.chauffeur.nom}` : undefined
                        });
                    });
                }
            }

            // 7. Mapper les données
            const missionsMap = new Map(missions?.map(m => [m.mission_id, m]));

            return transactions.map(t => {
                let missionId: number | undefined;

                // Cas 1: Directement lié à une mission
                if ((t.source_type === 'Mission' || t.source_type === 'mission') && t.source_id) {
                    missionId = t.source_id;
                }
                // Cas 2: Lié à un paiement
                else if ((t.source_type === 'Paiement' || t.source_type === 'paiement') && t.source_id) {
                    missionId = paiementIdToMissionId.get(t.source_id);
                }

                if (missionId) {
                    const mission = missionsMap.get(missionId);
                    if (mission) {
                        return {
                            ...t,
                            mission_solde: mission.solde,
                            mission_total: mission.montant_total,
                            mission_reference: mission.type_course,
                            vehicule_immatriculation: mission.vehicule?.immatriculation || '',
                            vehicule_marque_modele: mission.vehicule ? `${mission.vehicule.marque} ${mission.vehicule.modele}` : '',
                            chauffeur_nom: mission.chauffeur ? `${mission.chauffeur.prenom} ${mission.chauffeur.nom}` : undefined
                        };
                    }
                }
                
                // Cas 3: Dépense directe
                if ((t.source_type === 'Depense' || t.source_type === 'depense') && t.source_id) {
                    const depenseInfo = depensesVehiculesMap.get(t.source_id);
                    if (depenseInfo) {
                        return {
                            ...t,
                            vehicule_immatriculation: depenseInfo.immatriculation,
                            vehicule_marque_modele: depenseInfo.marque_modele,
                            chauffeur_nom: depenseInfo.chauffeur_nom
                        };
                    }
                }
                
                return t;
            }) as TransactionWithDetails[];
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

export function useValidateMultiIncome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            dateEntree,
            description,
            items
        }: {
            dateEntree: Date;
            description: string;
            items: Array<{
                qte: number;
                description: string;
                pu_usd: number;
                pu_cdf: number;
            }>;
        }) => {
            const { data, error } = await supabase.rpc('validate_multi_income', {
                p_date_entree: dateEntree.toISOString(),
                p_description_globale: description,
                p_items: items
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caisse'] });
        },
    });
}
