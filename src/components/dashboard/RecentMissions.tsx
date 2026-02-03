import { mockMissions, mockVehicles, mockDrivers } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  scheduled: { label: 'Planifiée', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  in_progress: { label: 'En cours', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  completed: { label: 'Terminée', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Annulée', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export function RecentMissions() {
  const recentMissions = mockMissions.slice(0, 4);

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Missions Récentes</h3>
        <a href="/missions" className="text-sm font-medium text-primary hover:underline">
          Voir tout
        </a>
      </div>

      <div className="space-y-3">
        {recentMissions.map((mission, index) => {
          const vehicle = mockVehicles.find(v => v.id === mission.vehicleId);
          const driver = mockDrivers.find(d => d.id === mission.driverId);
          const status = statusConfig[mission.status];

          return (
            <div
              key={mission.id}
              className="rounded-lg border border-border bg-background/50 p-4 hover:bg-accent/50 transition-colors cursor-pointer animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground truncate">
                      {mission.serviceType}
                    </span>
                    <Badge variant="outline" className={cn('text-xs', status.className)}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{mission.departure} → {mission.destination}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(mission.scheduledStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {driver && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{driver.firstName} {driver.lastName[0]}.</span>
                        </div>
                      )}
                      
                      {vehicle && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Car className="h-3.5 w-3.5" />
                          <span>{vehicle.licensePlate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
