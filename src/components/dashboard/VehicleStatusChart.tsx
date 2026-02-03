import { mockVehicles } from '@/data/mockData';

export function VehicleStatusChart() {
  const statusCounts = mockVehicles.reduce((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statuses = [
    { key: 'available', label: 'Disponible', color: 'bg-status-available' },
    { key: 'assigned', label: 'Affecté', color: 'bg-status-assigned' },
    { key: 'maintenance', label: 'En maintenance', color: 'bg-status-maintenance' },
    { key: 'cleaning', label: 'Nettoyage', color: 'bg-status-cleaning' },
    { key: 'offline', label: 'Hors service', color: 'bg-status-offline' },
  ];

  const total = mockVehicles.length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">État de la Flotte</h3>
      
      <div className="space-y-4">
        {/* Progress bars */}
        <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
          {statuses.map((status) => {
            const count = statusCounts[status.key] || 0;
            const percentage = (count / total) * 100;
            return percentage > 0 ? (
              <div
                key={status.key}
                className={`${status.color} h-full transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {statuses.map((status) => {
            const count = statusCounts[status.key] || 0;
            return (
              <div key={status.key} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${status.color}`} />
                <span className="text-sm text-muted-foreground">{status.label}</span>
                <span className="text-sm font-semibold text-foreground ml-auto">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
