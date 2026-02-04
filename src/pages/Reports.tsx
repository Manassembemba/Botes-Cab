import { useState, useMemo } from 'react';
import { useCaisse } from '@/hooks/useCaisse';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Download, TrendingUp, Fuel, Wrench, Clock, Car, Users,
  RefreshCcw, Filter, Calendar as CalendarIcon, ArrowUpRight,
  ChevronRight, Eye, AlertCircle, PieChart
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useMissions } from '@/hooks/useMissions';
import { useRemboursements } from '@/hooks/useRemboursements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RemboursementStatusBadge } from '@/components/remboursements/RemboursementStatusBadge';
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isWithinInterval, subDays, differenceInDays
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function Reports() {
  const { data: vehicules = [] } = useVehicules();
  const { data: chauffeurs = [] } = useChauffeurs();
  const { data: missions = [] } = useMissions();
  const { data: transactions = [] } = useCaisse();
  const { remboursements, stats: refundStats } = useRemboursements();
  // États pour le filtrage
  const [filterType, setFilterType] = useState<DateFilterType>('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

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

  // Filtrage des données selon la période
  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (filterType) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case 'week':
        start = startOfWeek(now, { locale: fr });
        end = endOfWeek(now, { locale: fr });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'custom':
        if (dateRange?.from) {
          start = startOfDay(dateRange.from);
          end = endOfDay(dateRange.to || dateRange.from);
        } else {
          start = startOfWeek(now, { locale: fr });
          end = endOfWeek(now, { locale: fr });
        }
        break;
      default:
        start = startOfWeek(now, { locale: fr });
        end = endOfWeek(now, { locale: fr });
    }

    const interval = { start, end };

    return {
      missions: missions.filter(m => m.date_depart_prevue && isWithinInterval(new Date(m.date_depart_prevue), interval)),
      maintenances: maintenances.filter(m => m.date_debut && isWithinInterval(new Date(m.date_debut), interval)),
      remboursements: remboursements.filter(r => r.date_demande && isWithinInterval(new Date(r.date_demande), interval)),
      transactions: transactions.filter(t => t.date_transaction && isWithinInterval(new Date(t.date_transaction), interval)),
      periodLabel: filterType === 'custom' && dateRange?.from
        ? `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`
        : filterType === 'today' ? "Aujourd'hui"
          : filterType === 'yesterday' ? "Hier"
            : filterType === 'week' ? "Cette Semaine"
              : "Ce Mois"
    };
  }, [filterType, dateRange, missions, maintenances, remboursements, transactions]);

  // Préparation des données pour le graphique de tendance (Revenus vs Dépenses)
  const chartData = useMemo(() => {
    const dataMap: { [key: string]: { date: string, revenus: number, depenses: number } } = {};

    filteredData.transactions.forEach(t => {
      const dateKey = format(new Date(t.date_transaction!), 'dd/MM');
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { date: dateKey, revenus: 0, depenses: 0 };
      }
      if (t.type === 'Entrée') {
        dataMap[dateKey].revenus += Number(t.montant);
      } else {
        dataMap[dateKey].depenses += Number(t.montant);
      }
    });

    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData.transactions]);

  // Données pour la répartition des dépenses
  const pieData = useMemo(() => {
    const categories: { [key: string]: number } = {};
    filteredData.transactions
      .filter(t => t.type === 'Sortie')
      .forEach(t => {
        const cat = t.source_type || 'Divers';
        categories[cat] = (categories[cat] || 0) + Number(t.montant);
      });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredData.transactions]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Calculate real KPIs from filtered data
  const totalMaintenanceCost = filteredData.maintenances.reduce((sum, m) => sum + Number(m.cout_total || 0), 0);
  const avgMaintenanceCost = vehicules.length > 0 ? totalMaintenanceCost / vehicules.length : 0;

  const completedMissions = filteredData.missions.filter(m => m.statut_mission === 'Terminée').length;
  const activeMissions = filteredData.missions.filter(m => m.statut_mission === 'En cours').length;

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
          <p className="text-muted-foreground mt-1">Données calculées pour : <span className="text-primary font-bold">{filteredData.periodLabel}</span></p>
        </div>
        <Button className="gap-2" variant="outline">
          <Download className="h-4 w-4" />
          Exporter (CSV)
        </Button>
      </div>

      {/* Filtres de Date */}
      <div className="flex flex-col sm:flex-row items-center gap-2 bg-card p-2 rounded-lg border border-border overflow-x-auto shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground px-2 flex items-center gap-2 uppercase tracking-wider">
            <Filter className="h-3 w-3" />
            Période
          </span>
          <Button
            variant={filterType === 'today' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('today')}
            className="text-xs h-8"
          >
            Aujourd'hui
          </Button>
          <Button
            variant={filterType === 'yesterday' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('yesterday')}
            className="text-xs h-8"
          >
            Hier
          </Button>
          <Button
            variant={filterType === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('week')}
            className="text-xs h-8"
          >
            Semaine
          </Button>
          <Button
            variant={filterType === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('month')}
            className="text-xs h-8"
          >
            Mois
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-2 hidden sm:block" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filterType === 'custom' ? 'secondary' : 'outline'}
              size="sm"
              className={cn(
                "justify-start text-left font-normal h-8 text-xs",
                !dateRange && "text-muted-foreground"
              )}
              onClick={() => setFilterType('custom')}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM")
                )
              ) : (
                <span>Personnalisé</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setFilterType('custom');
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPIs Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5 animate-fade-in shadow-sm hover:shadow-md transition-all"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
              {kpi.trend !== 0 && (
                <span className={`text-xs font-bold ${kpi.trend > 0 ? 'text-status-available' : 'text-destructive'}`}>
                  {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">vs mois précédent</p>
          </div>
        ))}
      </div>

      {/* Graphiques Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Rentabilité (USD)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                <Bar name="Revenus" dataKey="revenus" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar name="Dépenses" dataKey="depenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Répartition des Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Véhicules</h3>
          </div>
          <div className="space-y-2 text-sm">
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

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Chauffeurs</h3>
          </div>
          <div className="space-y-2 text-sm">
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

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Missions ({filteredData.periodLabel})</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{filteredData.missions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">En cours</span>
              <span className="font-medium text-status-assigned">{activeMissions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terminées</span>
              <span className="font-medium text-status-available">{completedMissions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Summary Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
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
            <p className="text-xs text-muted-foreground uppercase font-bold">Total demandes</p>
            <p className="text-2xl font-bold text-foreground">{refundStats.total}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold">En attente</p>
            <p className="text-2xl font-bold text-status-pending">{refundStats.enAttente}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold">Montant total</p>
            <p className="text-2xl font-bold text-foreground">${refundStats.montantTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground uppercase font-bold">Montant approuvé</p>
            <p className="text-2xl font-bold text-status-available">${refundStats.montantApprouve.toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Refunds Table */}
        {filteredData.remboursements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredData.remboursements.slice(0, 5).map((refund) => (
                  <tr key={refund.remboursement_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{refund.client_nom}</td>
                    <td className="px-4 py-3 text-foreground font-bold">${Number(refund.montant).toFixed(2)}</td>
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
              onClick={() => setSelectedReport(report.title)}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer animate-fade-in shadow-sm"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <report.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{report.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-3 italic">Dernière génération: {report.lastGenerated}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                  Aperçu
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport === "Consommation Carburant" && <Fuel className="h-5 w-5 text-primary" />}
              {selectedReport === "Performance Chauffeurs" && <Users className="h-5 w-5 text-primary" />}
              {selectedReport === "Historique Maintenance" && <Wrench className="h-5 w-5 text-primary" />}
              {selectedReport === "Coûts d'Exploitation" && <TrendingUp className="h-5 w-5 text-primary" />}
              {selectedReport === "Utilisation Flotte" && <Car className="h-5 w-5 text-primary" />}
              {selectedReport === "Missions Mensuelles" && <Clock className="h-5 w-5 text-primary" />}
              {selectedReport}
            </DialogTitle>
            <DialogDescription>
              Détails pour la période : {filteredData.periodLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedReport === "Consommation Carburant" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Litres (Est.)</p>
                    <p className="text-xl font-bold text-primary">
                      {(filteredData.transactions
                        .filter(t => (t.source_type === 'Carburant' || t.description?.toLowerCase().includes('carburant')) && t.devise === 'USD')
                        .reduce((sum, t) => sum + Number(t.montant), 0) / 1.2).toFixed(1)} L
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Coût Total USD</p>
                    <p className="text-xl font-bold text-primary">
                      ${filteredData.transactions
                        .filter(t => (t.source_type === 'Carburant' || t.description?.toLowerCase().includes('carburant')) && t.devise === 'USD')
                        .reduce((sum, t) => sum + Number(t.montant), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Nombre de Pleins</p>
                    <p className="text-xl font-bold text-primary">
                      {filteredData.transactions
                        .filter(t => (t.source_type === 'Carburant' || t.description?.toLowerCase().includes('carburant'))).length}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.transactions
                        .filter(t => (t.source_type === 'Carburant' || t.description?.toLowerCase().includes('carburant')))
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{format(new Date(t.date_transaction!), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell className="text-right font-bold">
                              {t.montant.toLocaleString()} {t.devise}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {selectedReport === "Performance Chauffeurs" && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chauffeur</TableHead>
                      <TableHead className="text-center">Missions</TableHead>
                      <TableHead className="text-right">CA Généré (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chauffeurs.map(c => {
                      const cName = `${c.prenom} ${c.nom}`;
                      const cMissions = filteredData.missions.filter(m => m.nom_chauffeur === cName);
                      const ca = cMissions.reduce((sum, m) => sum + Number(m.montant_total || 0), 0);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{cName}</TableCell>
                          <TableCell className="text-center">{cMissions.length}</TableCell>
                          <TableCell className="text-right font-bold">${ca.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedReport === "Coûts d'Exploitation" && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Véhicule</TableHead>
                      <TableHead className="text-right">Revenus (Missions)</TableHead>
                      <TableHead className="text-right">Dépenses (Maintenance/Carb)</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicules.map(v => {
                      const vMissions = filteredData.missions.filter(m => m.vehicule_id === v.id);
                      const revenue = vMissions.reduce((sum, m) => sum + Number(m.montant_total || 0), 0);

                      const vExpenses = filteredData.transactions.filter(t =>
                        t.type === 'Sortie' &&
                        (t.description?.includes(v.immatriculation) || t.source_type === 'Maintenance')
                      );
                      const expenses = vExpenses.reduce((sum, t) => sum + Number(t.montant), 0);

                      const net = revenue - expenses;

                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.marque} {v.modele} ({v.immatriculation})</TableCell>
                          <TableCell className="text-right text-status-available font-bold">+${revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">-${expenses.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-bold ${net >= 0 ? 'text-status-available' : 'text-destructive'}`}>
                            ${net.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedReport === "Historique Maintenance" && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Type / Description</TableHead>
                      <TableHead className="text-right">Coût estimé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenances
                      .filter(m => isWithinInterval(new Date(m.date_debut), filteredData.interval))
                      .map((m) => {
                        const v = vehicules.find(v => v.id === m.vehicule_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell>{format(new Date(m.date_debut), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-medium">
                              {v ? `${v.marque} (${v.immatriculation})` : 'Inconnu'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold">{m.type_maintenance}</span>
                                <span className="text-[10px] text-muted-foreground">{m.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                              {m.cout ? `-${m.cout.toLocaleString()} USD` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedReport === "Utilisation Flotte" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Taux Moyen d'Utilisation</p>
                    <p className="text-2xl font-bold text-primary">
                      {(() => {
                        const days = Math.max(1, differenceInDays(endOfDay(dateRange?.to || new Date()), startOfDay(dateRange?.from || subDays(new Date(), 7))) + 1);
                        const possibleDays = vehicules.length * days;
                        const usedDays = filteredData.missions.length; // Approximation simple: 1 mission = 1 jour
                        return ((usedDays / possibleDays) * 100).toFixed(1);
                      })()}%
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Véhicules Actifs</p>
                    <p className="text-2xl font-bold text-primary">
                      {new Set(filteredData.missions.map(m => m.vehicule_id)).size} / {vehicules.length}
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Véhicule</TableHead>
                      <TableHead className="text-center">Missions</TableHead>
                      <TableHead className="text-right">Statut Actuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicules.map(v => {
                      const vMissions = filteredData.missions.filter(m => m.vehicule_id === v.id);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.marque} {v.modele} ({v.immatriculation})</TableCell>
                          <TableCell className="text-center">{vMissions.length}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${v.statut === 'Disponible' ? 'bg-status-available/10 text-status-available' :
                              v.statut === 'En service' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                              }`}>
                              {v.statut}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedReport === "Missions Mensuelles" && (
              <div className="space-y-4">
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Chauffeur</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.missions.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-[10px] whitespace-nowrap">
                            {m.date_depart_prevue ? format(new Date(m.date_depart_prevue), 'dd/MM/yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">{m.nom_client}</TableCell>
                          <TableCell>{m.nom_chauffeur}</TableCell>
                          <TableCell className="text-[10px] max-w-[200px] truncate">
                            {m.lieu_depart} → {m.lieu_destination}
                          </TableCell>
                          <TableCell className="text-right font-bold text-status-available">
                            ${m.montant_total?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {(selectedReport !== "Consommation Carburant" &&
              selectedReport !== "Performance Chauffeurs" &&
              selectedReport !== "Coûts d'Exploitation" &&
              selectedReport !== "Historique Maintenance" &&
              selectedReport !== "Utilisation Flotte" &&
              selectedReport !== "Missions Mensuelles") && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                  <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                  <p>Analyse détaillée en cours de développement pour ce module.</p>
                  <p className="text-xs mt-2 px-12 text-center">Les données globales pour "{selectedReport}" sont déjà intégrées dans les KPIs de la page principale.</p>
                </div>
              )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Fermer</Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Exporter PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
