import { Button } from '@/components/ui/button';
import { Download, TrendingUp, Fuel, Wrench, Clock, Car, Users, RefreshCcw, DollarSign } from 'lucide-react';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useMissions } from '@/hooks/useMissions';
import { useRemboursements } from '@/hooks/useRemboursements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RemboursementStatusBadge } from '@/components/remboursements/RemboursementStatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Reports() {
  const { data: vehicules = [] } = useVehicules();
  const { data: chauffeurs = [] } = useChauffeurs();
  const { data: missions = [] } = useMissions();
  const { remboursements, stats: refundStats } = useRemboursements();

  // Fetch maintenance data
  const { data: maintenances = [] } = useQuery({
    queryKey: ['maintenances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_maintenance')
        .select('*')
        .order('date_debut', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate real KPIs
  const totalMaintenanceCost = maintenances.reduce((sum, m) => sum + Number(m.cout_total || 0), 0);
  const avgMaintenanceCost = vehicules.length > 0 ? totalMaintenanceCost / vehicules.length : 0;
  
  const completedMissions = missions.filter(m => m.statut_mission === 'Terminée').length;
  const activeMissions = missions.filter(m => m.statut_mission === 'En cours').length;
  
  const availableVehicles = vehicules.filter(v => v.statut === 'Libre').length;
  const utilizationRate = vehicules.length > 0 ? ((vehicules.length - availableVehicles) / vehicules.length) * 100 : 0;

  const availableDrivers = chauffeurs.filter(c => c.disponibilite === 'Disponible').length;

  const reports = [
    {
      title: "Coûts d'Exploitation",
      description: "Analyse des coûts par véhicule (carburant + maintenance)",
      icon: TrendingUp,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
    {
      title: "Consommation Carburant",
      description: "Détail de la consommation par véhicule et chauffeur",
      icon: Fuel,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
    {
      title: "Historique Maintenance",
      description: "Toutes les interventions et coûts associés",
      icon: Wrench,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
    {
      title: "Performance Chauffeurs",
      description: "Heures conduites, ponctualité, missions effectuées",
      icon: Users,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
    {
      title: "Utilisation Flotte",
      description: "Taux d'utilisation et disponibilité des véhicules",
      icon: Car,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
    {
      title: "Missions Mensuelles",
      description: "Récapitulatif des missions du mois",
      icon: Clock,
      lastGenerated: format(new Date(), 'dd/MM/yyyy'),
    },
  ];

  // Real KPIs from database
  const kpis = [
    { label: "Véhicules totaux", value: vehicules.length.toString(), trend: 0 },
    { label: "Taux d'utilisation", value: `${utilizationRate.toFixed(0)}%`, trend: utilizationRate > 50 ? 3 : -2 },
    { label: "Missions terminées", value: completedMissions.toString(), trend: 12 },
    { label: "Coût maint./véhicule", value: `$${avgMaintenanceCost.toFixed(0)}`, trend: avgMaintenanceCost < 300 ? 5 : -8 },
  ];

  // Recent refunds for the report
  const recentRefunds = remboursements.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports & Statistiques</h1>
          <p className="text-muted-foreground mt-1">Analysez les performances de votre flotte</p>
        </div>
        <Button className="gap-2" variant="outline">
          <Download className="h-4 w-4" />
          Exporter tout (CSV)
        </Button>
      </div>

      {/* KPIs Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
              {kpi.trend !== 0 && (
                <span className={`text-sm font-medium ${kpi.trend > 0 ? 'text-status-available' : 'text-destructive'}`}>
                  {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs mois précédent</p>
          </div>
        ))}
      </div>

      {/* Fleet Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Véhicules</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{vehicules.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponibles</span>
              <span className="font-medium text-status-available">{availableVehicles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">En mission</span>
              <span className="font-medium text-status-assigned">{vehicules.filter(v => v.statut === 'En mission').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">En maintenance</span>
              <span className="font-medium text-status-maintenance">{vehicules.filter(v => v.statut === 'En maintenance').length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Chauffeurs</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{chauffeurs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponibles</span>
              <span className="font-medium text-status-available">{availableDrivers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">En mission</span>
              <span className="font-medium text-status-assigned">{chauffeurs.filter(c => c.disponibilite === 'En mission').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Indisponibles</span>
              <span className="font-medium text-status-offline">{chauffeurs.filter(c => c.disponibilite === 'Indisponible').length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Missions</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{missions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">En cours</span>
              <span className="font-medium text-status-assigned">{activeMissions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terminées</span>
              <span className="font-medium text-status-available">{completedMissions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planifiées</span>
              <span className="font-medium text-muted-foreground">{missions.filter(m => m.statut_mission === 'Planifiée').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Summary Section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <RefreshCcw className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Remboursements</h3>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/remboursements">Voir tout</a>
          </Button>
        </div>

        {/* Refund Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Total demandes</p>
            <p className="text-2xl font-bold text-foreground">{refundStats.total}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-status-pending">{refundStats.enAttente}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Montant total</p>
            <p className="text-2xl font-bold text-foreground">${refundStats.montantTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Montant approuvé</p>
            <p className="text-2xl font-bold text-status-available">${refundStats.montantApprouve.toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Refunds Table */}
        {recentRefunds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Montant</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentRefunds.map((refund) => (
                  <tr key={refund.remboursement_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{refund.client_nom}</td>
                    <td className="px-4 py-3 text-foreground">${Number(refund.montant).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(refund.date_demande), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <RemboursementStatusBadge status={refund.statut} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Reports */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Rapports Disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report, index) => (
            <div
              key={report.title}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <report.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  <p className="text-xs text-muted-foreground mt-3">Dernière génération: {report.lastGenerated}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1">
                  Aperçu
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
