import { StatCard } from '@/components/dashboard/StatCard';
import { VehicleStatusChart } from '@/components/dashboard/VehicleStatusChart';
import { RecentMissions } from '@/components/dashboard/RecentMissions';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useMissions } from '@/hooks/useMissions';
import { useAlerts } from '@/hooks/useAlerts';
import { Car, Users, CalendarClock, Wrench, TrendingUp, AlertTriangle, Loader2, BarChart } from 'lucide-react';
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
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Tableau de Bord</h1>
          <p className="text-sm text-muted-foreground">Bienvenue sur le cockpit de pilotage Botes CAB</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Système Opérationnel
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Véhicules"
          value={stats.totalVehicles}
          subtitle={`${stats.availableVehicles} libres`}
          icon={Car}
          variant="primary"
        />
        <StatCard
          title="Chauffeurs"
          value={stats.totalDrivers}
          subtitle={`${stats.availableDrivers} libres`}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Missions"
          value={stats.activeMissions}
          subtitle="En cours"
          icon={CalendarClock}
          variant="default"
        />
        <StatCard
          title="Terminées"
          value={stats.completedMissionsToday}
          subtitle="Aujourd'hui"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Maintenance"
          value={stats.inMaintenance}
          subtitle="A réviser"
          icon={Wrench}
          variant="warning"
        />
        <StatCard
          title="Alertes"
          value={stats.totalAlerts}
          subtitle="A vérifier"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <VehicleStatusChart />
            
            <div className="rounded-xl border border-border bg-card p-5 animate-fade-in shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
                <BarChart className="h-24 w-24" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-6">Taux d'Utilisation</h3>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative h-40 w-40">
                  <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 120 120">
                    <circle
                      className="text-muted/30"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                    />
                    <circle
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={`${stats.fleetUtilization * 3.27} 327`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-foreground">{stats.fleetUtilization}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Actif</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6 text-center max-w-[200px]">
                  {stats.fleetUtilization > 70 ? "Forte sollicitation de la flotte" : "Capacité de déploiement disponible"}
                </p>
              </div>
            </div>
          </div>

          <RecentMissions />
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          <QuickActions />
          <AlertsPanel />
        </div>
      </div>
    </div>
  );
}
