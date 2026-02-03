import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-primary/10 border-primary/20',
  success: 'bg-status-available/10 border-status-available/20',
  warning: 'bg-status-maintenance/10 border-status-maintenance/20',
  danger: 'bg-destructive/10 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/20 text-primary',
  success: 'bg-status-available/20 text-status-available',
  warning: 'bg-status-maintenance/20 text-status-maintenance',
  danger: 'bg-destructive/20 text-destructive',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border p-5 transition-all duration-200 hover:shadow-lg animate-fade-in',
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <span className={cn(
                'text-sm font-medium',
                trend.positive ? 'text-status-available' : 'text-destructive'
              )}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'rounded-lg p-3',
          iconVariantStyles[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
