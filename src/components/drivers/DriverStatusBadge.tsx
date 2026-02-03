import { DriverStatus } from '@/types/fleet';
import { cn } from '@/lib/utils';

const statusConfig: Record<DriverStatus, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  on_mission: { label: 'En mission', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  off_duty: { label: 'Repos', className: 'bg-muted text-muted-foreground border-border' },
  sick_leave: { label: 'Arrêt maladie', className: 'bg-status-maintenance/20 text-status-maintenance border-status-maintenance/30' },
};

interface DriverStatusBadgeProps {
  status: DriverStatus;
  size?: 'sm' | 'md';
}

export function DriverStatusBadge({ status, size = 'md' }: DriverStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      config.className,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      {config.label}
    </span>
  );
}
