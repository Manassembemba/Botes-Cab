import { Driver } from '@/types/fleet';
import { DriverStatusBadge } from './DriverStatusBadge';
import { Phone, Mail, FileText, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverCardProps {
  driver: Driver;
  onClick?: () => void;
}

const contractLabels = {
  cdi: 'CDI',
  cdd: 'CDD',
  interim: 'Intérimaire',
};

export function DriverCard({ driver, onClick }: DriverCardProps) {
  const initials = `${driver.firstName[0]}${driver.lastName[0]}`;
  const licenseExpiringSoon = new Date(driver.licenseExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-xl border bg-card p-5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary/30 animate-fade-in',
        licenseExpiringSoon && 'border-status-maintenance/50'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{driver.firstName} {driver.lastName}</h3>
            <p className="text-sm text-muted-foreground">{contractLabels[driver.contractType]}</p>
          </div>
        </div>
        <DriverStatusBadge status={driver.status} size="sm" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{driver.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{driver.email}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border mt-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Permis {driver.licenseType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{driver.totalMissions}</span>
            <span className="text-muted-foreground">missions</span>
          </div>
        </div>
      </div>

      {licenseExpiringSoon && (
        <div className="mt-4 rounded-lg bg-status-maintenance/10 border border-status-maintenance/20 px-3 py-2">
          <p className="text-xs font-medium text-status-maintenance">
            Permis expire le {new Date(driver.licenseExpiry).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}
    </div>
  );
}
