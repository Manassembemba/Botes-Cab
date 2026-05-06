import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = 
  | 'available' | 'assigned' | 'maintenance' | 'offline' | 'cleaning' // Véhicules
  | 'on_mission' | 'off_duty' | 'sick_leave' // Chauffeurs
  | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' // Missions
  | 'pending' | 'approved' | 'rejected' | 'paid'; // Général/Finance

interface StatusConfig {
  label: string;
  colorClass: string;
  dotClass: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  // Véhicules
  'available': { label: 'Disponible', colorClass: 'bg-status-available/10 text-status-available border-status-available/20', dotClass: 'bg-status-available' },
  'Libre': { label: 'Disponible', colorClass: 'bg-status-available/10 text-status-available border-status-available/20', dotClass: 'bg-status-available' },
  'assigned': { label: 'Assigné', colorClass: 'bg-status-assigned/10 text-status-assigned border-status-assigned/20', dotClass: 'bg-status-assigned' },
  'En mission': { label: 'En mission', colorClass: 'bg-status-assigned/10 text-status-assigned border-status-assigned/20', dotClass: 'bg-status-assigned' },
  'maintenance': { label: 'Maintenance', colorClass: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20', dotClass: 'bg-status-maintenance' },
  'Maintenance': { label: 'Maintenance', colorClass: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20', dotClass: 'bg-status-maintenance' },
  'offline': { label: 'Hors service', colorClass: 'bg-status-offline/10 text-status-offline border-status-offline/20', dotClass: 'bg-status-offline' },
  'cleaning': { label: 'Nettoyage', colorClass: 'bg-status-cleaning/10 text-status-cleaning border-status-cleaning/20', dotClass: 'bg-status-cleaning' },
  
  // Chauffeurs
  'on_mission': { label: 'En mission', colorClass: 'bg-status-assigned/10 text-status-assigned border-status-assigned/20', dotClass: 'bg-status-assigned' },
  'off_duty': { label: 'Repos', colorClass: 'bg-muted text-muted-foreground border-border', dotClass: 'bg-muted-foreground' },
  'Disponible': { label: 'Disponible', colorClass: 'bg-status-available/10 text-status-available border-status-available/20', dotClass: 'bg-status-available' },
  'sick_leave': { label: 'Arrêt maladie', colorClass: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20', dotClass: 'bg-status-maintenance' },
  
  // Missions
  'scheduled': { label: 'Programmé', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dotClass: 'bg-blue-500' },
  'Planifiée': { label: 'Planifiée', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dotClass: 'bg-blue-500' },
  'in_progress': { label: 'En cours', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500' },
  'En cours': { label: 'En cours', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500' },
  'completed': { label: 'Terminée', colorClass: 'bg-status-available/10 text-status-available border-status-available/20', dotClass: 'bg-status-available' },
  'Terminée': { label: 'Terminée', colorClass: 'bg-status-available/10 text-status-available border-status-available/20', dotClass: 'bg-status-available' },
  'cancelled': { label: 'Annulée', colorClass: 'bg-status-offline/10 text-status-offline border-status-offline/20', dotClass: 'bg-status-offline' },
  'Annulée': { label: 'Annulée', colorClass: 'bg-status-offline/10 text-status-offline border-status-offline/20', dotClass: 'bg-status-offline' },

  // Finance
  'pending': { label: 'En attente', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500' },
  'En attente': { label: 'En attente', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500' },
  'paid': { label: 'Payé', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dotClass: 'bg-emerald-500' },
  'Approuvé': { label: 'Approuvé', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dotClass: 'bg-emerald-500' },
  'Refusé': { label: 'Refusé', colorClass: 'bg-destructive/10 text-destructive border-destructive/20', dotClass: 'bg-destructive' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfigs[status] || { 
    label: status, 
    colorClass: 'bg-muted text-muted-foreground border-border', 
    dotClass: 'bg-muted-foreground' 
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium transition-all duration-200 gap-1.5 py-0.5", 
        config.colorClass, 
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-soft", config.dotClass)} />
      )}
      {config.label}
    </Badge>
  );
}
