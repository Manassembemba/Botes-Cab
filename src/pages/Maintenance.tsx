import { useState } from 'react';
import { useMaintenance, type MaintenanceWithDetails } from '@/hooks/useMaintenance';
import { MaintenanceFormDialog } from '@/components/maintenance/MaintenanceFormDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, Car, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  planifiee: { label: 'Planifiée', icon: Clock, className: 'bg-status-maintenance/20 text-status-maintenance' },
  en_cours: { label: 'En cours', icon: Wrench, className: 'bg-status-assigned/20 text-status-assigned' },
  terminee: { label: 'Terminée', icon: CheckCircle, className: 'bg-status-available/20 text-status-available' },
};

const priorityConfig = {
  basse: { label: 'Basse', className: 'bg-muted text-muted-foreground' },
  moyenne: { label: 'Moyenne', className: 'bg-status-maintenance/20 text-status-maintenance' },
  haute: { label: 'Haute', className: 'bg-destructive/20 text-destructive' },
};

export default function Maintenance() {
  const { data: maintenanceItems, isLoading, error } = useMaintenance();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceWithDetails | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Erreur lors du chargement des données de maintenance</p>
      </div>
    );
  }

  const pendingCount = maintenanceItems?.filter(m => m.statut === 'planifiee').length || 0;
  const inProgressCount = maintenanceItems?.filter(m => m.statut === 'en_cours').length || 0;
  const highPriorityCount = maintenanceItems?.filter(m => m.priorite === 'haute' && m.statut !== 'terminee').length || 0;

  const handleEdit = (maintenance: MaintenanceWithDetails) => {
    setEditingMaintenance(maintenance);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion de la Maintenance</h1>
          <p className="text-muted-foreground mt-1">
            {pendingCount} en attente • {inProgressCount} en cours
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvel Ordre de Travail
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-maintenance/20 p-3">
              <Clock className="h-5 w-5 text-status-maintenance" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-assigned/20 p-3">
              <Wrench className="h-5 w-5 text-status-assigned" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
              <p className="text-sm text-muted-foreground">En cours</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/20 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{highPriorityCount}</p>
              <p className="text-sm text-muted-foreground">Priorité haute</p>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Ordres de Travail</h3>
        </div>
        <div className="divide-y divide-border">
          {maintenanceItems?.map((item, index) => {
            const status = statusConfig[item.statut as keyof typeof statusConfig];
            const priority = priorityConfig[item.priorite as keyof typeof priorityConfig];
            const StatusIcon = status.icon;

            return (
              <div
                key={item.maintenance_id}
                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleEdit(item)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn('rounded-lg p-3 self-start', status.className)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-foreground">{item.description}</h4>
                      <Badge variant="outline" className={cn('text-xs', priority.className)}>
                        {priority.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.type_intervention}
                      </Badge>
                    </div>

                    {item.vehicule && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Car className="h-4 w-4" />
                          <span>{item.vehicule.marque} {item.vehicule.modele}</span>
                          <span className="text-foreground font-medium">{item.vehicule.immatriculation}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(item.date_prevue!).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={cn('px-3 py-1.5 rounded-full text-sm font-medium', status.className)}>
                    {status.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MaintenanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        maintenance={editingMaintenance}
      />
    </div>
  );
}
