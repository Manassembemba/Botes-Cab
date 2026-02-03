import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types pour les vues analytiques
export interface RentabiliteVehicule {
    vehicule_id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    categorie: string;
    revenus_totaux: number;
    nombre_missions: number;
    revenu_moyen_mission: number;
    depenses_carburant: number;
    depenses_maintenance: number;
    depenses_totales: number;
    marge_nette: number;
    roi_pourcentage: number;
    statut_rentabilite: 'Rentable' | 'Non Rentable' | 'Neutre';
}

export interface RentabiliteChauffeur {
    chauffeur_id: number;
    nom: string;
    prenom: string;
    tel: string;
    nombre_missions: number;
    revenus_generes: number;
    revenu_moyen_mission: number;
    total_remboursements: number;
    nombre_remboursements: number;
    marge_nette: number;
    marge_moyenne_mission: number;
}

export interface RentabiliteTypeCourse {
    type_course: string;
    nombre_missions: number;
    pourcentage_volume: number;
    revenus_totaux: number;
    revenu_moyen: number;
    revenu_min: number;
    revenu_max: number;
    total_paye: number;
    total_solde: number;
    taux_paiement: number;
}

export interface CompteResultat {
    mois: string;
    annee: string;
    mois_numero: string;
    total_revenus: number;
    revenus_usd: number;
    revenus_cdf: number;
    total_depenses: number;
    depenses_usd: number;
    depenses_cdf: number;
    resultat_net: number;
    nb_entrees: number;
    nb_sorties: number;
}

export interface Creance {
    mission_id: number;
    client_nom: string | null;
    type_course: string | null;
    lieu_depart: string;
    lieu_arrivee: string;
    date_depart_prevue: string;
    date_arrivee_reelle: string | null;
    statut_mission: string;
    montant_total: number;
    acompte: number;
    solde: number;
    devise: string;
    jours_impaye: number;
    categorie_creance: 'Récente' | 'À relancer' | 'En retard';
    immatriculation: string;
    chauffeur: string;
}

export interface DepenseParCategorie {
    mois: string;
    categorie: string;
    nombre_depenses: number;
    montant_total: number;
    montant_moyen: number;
    montant_usd: number;
    montant_cdf: number;
}

// Hook : Rentabilité par véhicule
export function useRentabiliteVehicules() {
    return useQuery({
        queryKey: ['rentabilite', 'vehicules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vue_rentabilite_vehicules')
                .select('*');

            if (error) throw error;
            return data as RentabiliteVehicule[];
        },
    });
}

// Hook : Rentabilité par chauffeur
export function useRentabiliteChauffeurs() {
    return useQuery({
        queryKey: ['rentabilite', 'chauffeurs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vue_rentabilite_chauffeurs')
                .select('*');

            if (error) throw error;
            return data as RentabiliteChauffeur[];
        },
    });
}

// Hook : Rentabilité par type de course
export function useRentabiliteTypesCourse() {
    return useQuery({
        queryKey: ['rentabilite', 'types_course'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vue_rentabilite_types_course')
                .select('*');

            if (error) throw error;
            return data as RentabiliteTypeCourse[];
        },
    });
}

// Hook : Compte de résultat (avec filtre optionnel par mois)
export function useCompteResultat(mois?: string) {
    return useQuery({
        queryKey: ['compte_resultat', mois],
        queryFn: async () => {
            let query = supabase.from('vue_compte_resultat').select('*');

            if (mois) {
                query = query.eq('mois', mois);
            }

            const { data, error } = await query.order('mois', { ascending: false });

            if (error) throw error;
            return data as CompteResultat[];
        },
    });
}

// Hook : Suivi des créances
export function useCreances() {
    return useQuery({
        queryKey: ['creances'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vue_creances')
                .select('*');

            if (error) throw error;
            return data as Creance[];
        },
    });
}

// Hook : Dépenses par catégorie (avec filtre optionnel par mois)
export function useDepensesParCategorie(mois?: string) {
    return useQuery({
        queryKey: ['depenses_categorie', mois],
        queryFn: async () => {
            let query = supabase.from('vue_depenses_par_categorie').select('*');

            if (mois) {
                query = query.eq('mois', mois);
            }

            const { data, error } = await query.order('mois', { ascending: false });

            if (error) throw error;
            return data as DepenseParCategorie[];
        },
    });
}

// Hook : Statistiques financières globales (KPIs)
export function useFinancialKPIs() {
    return useQuery({
        queryKey: ['financial_kpis'],
        queryFn: async () => {
            // Récupérer le compte de résultat du mois en cours
            const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

            const { data: compteResultat, error: crError } = await supabase
                .from('vue_compte_resultat')
                .select('*')
                .eq('mois', currentMonth)
                .single();

            if (crError && crError.code !== 'PGRST116') throw crError; // Ignorer "no rows" error

            // Récupérer le total des créances
            const { data: creances, error: creancesError } = await supabase
                .from('vue_creances')
                .select('solde, devise');

            if (creancesError) throw creancesError;

            const totalCreancesUSD = creances
                ?.filter(c => c.devise === 'USD')
                .reduce((sum, c) => sum + c.solde, 0) || 0;

            const totalCreancesCDF = creances
                ?.filter(c => c.devise === 'CDF')
                .reduce((sum, c) => sum + c.solde, 0) || 0;

            // Récupérer le solde de caisse actuel
            const { data: caisse, error: caisseError } = await supabase
                .from('tb_caisse')
                .select('type, montant, devise');

            if (caisseError) throw caisseError;

            const soldeCaisseUSD = caisse
                ?.filter(t => t.devise === 'USD')
                .reduce((sum, t) => sum + (t.type === 'Entrée' ? t.montant : -t.montant), 0) || 0;

            const soldeCaisseCDF = caisse
                ?.filter(t => t.devise === 'CDF')
                .reduce((sum, t) => sum + (t.type === 'Entrée' ? t.montant : -t.montant), 0) || 0;

            return {
                // Mois en cours
                revenus_mois: compteResultat?.total_revenus || 0,
                depenses_mois: compteResultat?.total_depenses || 0,
                resultat_mois: compteResultat?.resultat_net || 0,

                // Trésorerie
                solde_caisse_usd: soldeCaisseUSD,
                solde_caisse_cdf: soldeCaisseCDF,

                // Créances
                total_creances_usd: totalCreancesUSD,
                total_creances_cdf: totalCreancesCDF,
                nombre_creances: creances?.length || 0,

                // Marge
                marge_pourcentage: compteResultat?.total_revenus
                    ? ((compteResultat.resultat_net / compteResultat.total_revenus) * 100)
                    : 0,
            };
        },
    });
}
