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
    <div className="space-y-6 pb-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass rounded-2xl border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de la flotte Botes CAB</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Véhicules"
          value={stats.totalVehicles}
          subtitle={`${stats.availableVehicles} actifs`}
          icon={Car}
          variant="primary"
          className="glass hover:border-primary/50 transition-all"
        />
        <StatCard
          title="Opérateurs"
          value={stats.totalDrivers}
          subtitle={`${stats.availableDrivers} prêts`}
          icon={Users}
          variant="success"
          className="glass hover:border-status-available/50 transition-all"
        />
        <StatCard
          title="Missions"
          value={stats.activeMissions}
          subtitle="En cours"
          icon={CalendarClock}
          variant="default"
          className="glass hover:border-primary/50 transition-all"
        />
        <StatCard
          title="Success Rate"
          value={stats.completedMissionsToday}
          subtitle="Aujourd'hui"
          icon={TrendingUp}
          variant="success"
          className="glass hover:border-status-available/50 transition-all"
        />
        <StatCard
          title="Maintenance"
          value={stats.inMaintenance}
          subtitle="A réviser"
          icon={Wrench}
          variant="warning"
          className="glass hover:border-status-maintenance/50 transition-all"
        />
        <StatCard
          title="Incidents"
          value={stats.totalAlerts}
          subtitle="Critiques"
          icon={AlertTriangle}
          variant="danger"
          className="glass border-destructive/20 hover:border-destructive/50 transition-all"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-2xl p-4">
              <VehicleStatusChart />
            </div>
            
            <div className="rounded-2xl border border-primary/10 glass p-5 animate-fade-in shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 transition-opacity group-hover:opacity-10">
                <BarChart className="h-24 w-24 text-primary" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-6 uppercase tracking-tight font-mono">Système Load</h3>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative h-40 w-40">
                  <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 120 120">
                    <circle
                      className="text-primary/5"
                      strokeWidth="12"
                      stroke="currentColor"
                      fill="transparent"
                      r="50"
                      cx="60"
                      cy="60"
                    />
                    <circle
                      className="text-primary transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,222,0,0.5)]"
                      strokeWidth="12"
                      strokeDasharray={`${stats.fleetUtilization * 3.14} 314`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="50"
                      cx="60"
                      cy="60"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-foreground font-mono">{stats.fleetUtilization}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Capacité</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-6 text-center max-w-[200px] font-bold uppercase tracking-tighter">
                  {stats.fleetUtilization > 70 ? "ALERTE : Capacité critique" : "Système optimal"}
                </p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <RecentMissions />
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-2xl p-2">
            <QuickActions />
          </div>
          <div className="glass rounded-2xl p-2 border-destructive/10">
            <AlertsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
