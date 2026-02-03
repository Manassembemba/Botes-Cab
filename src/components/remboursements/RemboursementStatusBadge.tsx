import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RemboursementStatusBadgeProps {
  status: string;
}

export function RemboursementStatusBadge({ status }: RemboursementStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'En attente':
        return { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' };
      case 'En cours d\'examen':
        return { label: 'En examen', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
      case 'Approuvé':
        return { label: 'Approuvé', className: 'bg-green-500/20 text-green-600 border-green-500/30' };
      case 'Refusé':
        return { label: 'Refusé', className: 'bg-red-500/20 text-red-600 border-red-500/30' };
      case 'Remboursé':
        return { label: 'Remboursé', className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' };
      default:
        return { label: status, className: 'bg-muted text-muted-foreground' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
