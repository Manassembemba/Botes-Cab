import { StatCard } from '@/components/dashboard/StatCard';
import { VehicleStatusChart } from '@/components/dashboard/VehicleStatusChart';
import { RecentMissions } from '@/components/dashboard/RecentMissions';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useMissions } from '@/hooks/useMissions';
import { useAlerts } from '@/hooks/useAlerts';
import { Car, Users, CalendarClock, Wrench, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { isToday } from 'date-fns';

export default function Dashboard() {
  const { data: vehicules, isLoading: loadingVehicules } = useVehicules();
  const { data: chauffeurs, isLoading: loadingChauffeurs } = useChauffeurs();
  const { data: missions, isLoading: loadingMissions } = useMissions();
  const { data: alerts, isLoading: loadingAlerts } = useAlerts();

  if (loadingVehicules || loadingChauffeurs || loadingMissions || loadingAlerts) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    totalVehicles: vehicules?.length || 0,
    availableVehicles: vehicules?.filter(v => v.statut === 'Libre').length || 0,
    totalDrivers: chauffeurs?.length || 0,
    availableDrivers: chauffeurs?.filter(c => c.disponibilite === 'Disponible').length || 0,
    activeMissions: missions?.filter(m => m.statut_mission === 'En cours').length || 0,
    completedMissionsToday: missions?.filter(m => m.statut_mission === 'Terminée' && m.date_arrivee_reelle && isToday(new Date(m.date_arrivee_reelle))).length || 0,
    inMaintenance: vehicules?.filter(v => v.statut === 'Maintenance').length || 0,
    totalAlerts: alerts?.length || 0,
    fleetUtilization: vehicules?.length ? Math.round(((vehicules.length - (vehicules?.filter(v => v.statut === 'Libre').length || 0)) / vehicules.length) * 100) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de Bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre flotte Botes CAB</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Véhicules Total"
          value={stats.totalVehicles}
          subtitle={`${stats.availableVehicles} disponibles`}
          icon={Car}
          variant="primary"
        />
        <StatCard
          title="Chauffeurs"
          value={stats.totalDrivers}
          subtitle={`${stats.availableDrivers} disponibles`}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Missions Actives"
          value={stats.activeMissions}
          icon={CalendarClock}
          variant="default"
        />
        <StatCard
          title="Terminées Aujourd'hui"
          value={stats.completedMissionsToday}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="En Maintenance"
          value={stats.inMaintenance}
          icon={Wrench}
          variant="warning"
        />
        <StatCard
          title="Alertes"
          value={stats.totalAlerts}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Fleet Utilization */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <VehicleStatusChart />
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5 animate-fade-in h-full">
            <h3 className="text-lg font-semibold text-foreground mb-4">Taux d'Utilisation</h3>
            <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)]">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    className="text-muted"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="52"
                    cx="60"
                    cy="60"
                  />
                  <circle
                    className="text-primary"
                    strokeWidth="12"
                    strokeDasharray={`${stats.fleetUtilization * 3.27} 327`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="52"
                    cx="60"
                    cy="60"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{stats.fleetUtilization}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Utilisation de la flotte aujourd'hui</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
      </div>

      {/* Recent Missions */}
      <RecentMissions />
    </div>
  );
}
