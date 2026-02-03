import { mockVehicles } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, Car, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaintenanceItem {
  id: string;
  vehicleId: string;
  type: 'preventive' | 'corrective';
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
}

const mockMaintenanceItems: MaintenanceItem[] = [
  {
    id: 'mt1',
    vehicleId: 'v2',
    type: 'preventive',
    description: 'Vidange + Filtres',
    status: 'pending',
    scheduledDate: '2024-12-15',
    priority: 'medium',
  },
  {
    id: 'mt2',
    vehicleId: 'v3',
    type: 'corrective',
    description: 'Remplacement plaquettes de frein avant',
    status: 'in_progress',
    scheduledDate: '2024-12-02',
    priority: 'high',
  },
  {
    id: 'mt3',
    vehicleId: 'v6',
    type: 'corrective',
    description: 'Diagnostic système hybride',
    status: 'pending',
    scheduledDate: '2024-12-05',
    priority: 'high',
  },
  {
    id: 'mt4',
    vehicleId: 'v1',
    type: 'preventive',
    description: 'Contrôle technique périodique',
    status: 'completed',
    scheduledDate: '2024-11-28',
    priority: 'medium',
  },
];

const statusConfig = {
  pending: { label: 'En attente', icon: Clock, className: 'bg-status-maintenance/20 text-status-maintenance' },
  in_progress: { label: 'En cours', icon: Wrench, className: 'bg-status-assigned/20 text-status-assigned' },
  completed: { label: 'Terminé', icon: CheckCircle, className: 'bg-status-available/20 text-status-available' },
};

const priorityConfig = {
  low: { label: 'Basse', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Moyenne', className: 'bg-status-maintenance/20 text-status-maintenance' },
  high: { label: 'Haute', className: 'bg-destructive/20 text-destructive' },
};

export default function Maintenance() {
  const pendingCount = mockMaintenanceItems.filter(m => m.status === 'pending').length;
  const inProgressCount = mockMaintenanceItems.filter(m => m.status === 'in_progress').length;

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
        <Button className="gap-2">
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
              <p className="text-2xl font-bold text-foreground">
                {mockMaintenanceItems.filter(m => m.priority === 'high' && m.status !== 'completed').length}
              </p>
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
          {mockMaintenanceItems.map((item, index) => {
            const vehicle = mockVehicles.find(v => v.id === item.vehicleId);
            const status = statusConfig[item.status];
            const priority = priorityConfig[item.priority];
            const StatusIcon = status.icon;

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
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
                        {item.type === 'preventive' ? 'Préventif' : 'Correctif'}
                      </Badge>
                    </div>
                    
                    {vehicle && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Car className="h-4 w-4" />
                          <span>{vehicle.brand} {vehicle.model}</span>
                          <span className="text-foreground font-medium">{vehicle.licensePlate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(item.scheduledDate).toLocaleDateString('fr-FR')}</span>
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
    </div>
  );
}
