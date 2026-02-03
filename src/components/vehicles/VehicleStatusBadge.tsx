import { VehicleStatus } from '@/types/fleet';
import { cn } from '@/lib/utils';

const statusConfig: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  assigned: { label: 'Affecté', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  maintenance: { label: 'Maintenance', className: 'bg-status-maintenance/20 text-status-maintenance border-status-maintenance/30' },
  cleaning: { label: 'Nettoyage', className: 'bg-status-cleaning/20 text-status-cleaning border-status-cleaning/30' },
  offline: { label: 'Hors Service', className: 'bg-status-offline/20 text-status-offline border-status-offline/30' },
};

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  size?: 'sm' | 'md';
}

export function VehicleStatusBadge({ status, size = 'md' }: VehicleStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      config.className,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <span className={cn(
        'rounded-full mr-1.5',
        status === 'available' && 'bg-status-available',
        status === 'assigned' && 'bg-status-assigned',
        status === 'maintenance' && 'bg-status-maintenance',
        status === 'cleaning' && 'bg-status-cleaning',
        status === 'offline' && 'bg-status-offline',
        size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
      )} />
      {config.label}
    </span>
  );
}
