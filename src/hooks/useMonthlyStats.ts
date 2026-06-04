import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MonthlyStats {
  vehicles: Record<number, { usd: number; cdf: number; count: number }>;
  drivers: Record<number, { count: number; totalMissions: number }>;
}

export function useMonthlyStats() {
  return useQuery({
    queryKey: ['monthly-stats'],
    queryFn: async (): Promise<MonthlyStats> => {
      // Calcul du début du mois en cours en ISO string
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Récupérer toutes les missions du mois en cours
      const { data: missions, error } = await supabase
        .from('tb_missions')
        .select('vehicule_id, chauffeur_id, montant_total, devise, statut_mission, date_depart_prevue')
        .gte('date_depart_prevue', startOfMonth);

      if (error) {
        console.error('Erreur lors de la récupération des stats mensuelles:', error);
        throw error;
      }

      const stats: MonthlyStats = {
        vehicles: {},
        drivers: {},
      };

      if (!missions) return stats;

      missions.forEach((m) => {
        const vehicleId = m.vehicule_id;
        const chauffeurId = m.chauffeur_id;
        const amount = Number(m.montant_total) || 0;
        const devise = m.devise || 'USD';
        const isTerminee = m.statut_mission === 'Terminée';
        const isAnnulee = m.statut_mission === 'Annulée';

        // 1. Calcul des stats pour les véhicules (revenus des missions Terminées)
        if (vehicleId) {
          if (!stats.vehicles[vehicleId]) {
            stats.vehicles[vehicleId] = { usd: 0, cdf: 0, count: 0 };
          }
          if (isTerminee) {
            if (devise === 'CDF') {
              stats.vehicles[vehicleId].cdf += amount;
            } else {
              stats.vehicles[vehicleId].usd += amount;
            }
            stats.vehicles[vehicleId].count += 1;
          }
        }

        // 2. Calcul des stats pour les chauffeurs (missions effectuées - non annulées)
        if (chauffeurId) {
          if (!stats.drivers[chauffeurId]) {
            stats.drivers[chauffeurId] = { count: 0, totalMissions: 0 };
          }
          if (!isAnnulee) {
            stats.drivers[chauffeurId].totalMissions += 1;
            if (isTerminee) {
              stats.drivers[chauffeurId].count += 1;
            }
          }
        }
      });

      return stats;
    },
  });
}
