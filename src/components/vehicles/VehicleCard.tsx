import { Vehicle } from '@/types/fleet';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { Car, Fuel, Users, Gauge, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
}

const fuelTypeLabels = {
  diesel: 'Diesel',
  petrol: 'Essence',
  electric: 'Électrique',
  hybrid: 'Hybride',
};

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const maintenanceDue = vehicle.nextMaintenanceKm && vehicle.currentMileage >= vehicle.nextMaintenanceKm - 500;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-xl border bg-card p-5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary/30 animate-fade-in',
        maintenanceDue && 'border-status-maintenance/50'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{vehicle.brand} {vehicle.model}</h3>
            <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
          </div>
        </div>
        <VehicleStatusBadge status={vehicle.status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Fuel className="h-4 w-4" />
          <span>{fuelTypeLabels[vehicle.fuelType]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{vehicle.capacity} places</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gauge className="h-4 w-4" />
          <span>{vehicle.currentMileage.toLocaleString()} km</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{vehicle.year}</span>
        </div>
      </div>

      {maintenanceDue && (
        <div className="mt-4 rounded-lg bg-status-maintenance/10 border border-status-maintenance/20 px-3 py-2">
          <p className="text-xs font-medium text-status-maintenance">
            Maintenance requise à {vehicle.nextMaintenanceKm?.toLocaleString()} km
          </p>
        </div>
      )}
    </div>
  );
}
