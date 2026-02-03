import { AlertTriangle, FileWarning, Wrench, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/hooks/useAlerts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeIcons = {
  maintenance: Wrench,
  document: FileWarning,
  license: Calendar,
};

export function AlertsPanel() {
  const { data: alerts, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const alertsList = alerts || [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-status-maintenance" />
        <h3 className="text-lg font-semibold text-foreground">Alertes</h3>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-status-maintenance/20 text-xs font-bold text-status-maintenance">
          {alertsList.length}
        </span>
      </div>

      <div className="space-y-3">
        {alertsList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">Aucune alerte en cours</p>
        ) : (
          alertsList.map((alert, index) => {
            const Icon = typeIcons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors cursor-pointer animate-slide-in',
                  alert.severity === 'danger'
                    ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                    : 'border-status-maintenance/30 bg-status-maintenance/5 hover:bg-status-maintenance/10'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'rounded-lg p-2',
                    alert.severity === 'danger'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-status-maintenance/20 text-status-maintenance'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      alert.severity === 'danger' ? 'text-destructive' : 'text-status-maintenance'
                    )}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1">
                      Pour le: {format(new Date(alert.dueDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
