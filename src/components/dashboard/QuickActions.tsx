import { Plus, CalendarPlus, UserPlus, Car, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { 
      label: 'Nouvelle Mission', 
      icon: CalendarPlus, 
      onClick: () => navigate('/missions'),
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Planifier un trajet'
    },
    { 
      label: 'Nouveau Chauffeur', 
      icon: UserPlus, 
      onClick: () => navigate('/drivers'),
      color: 'bg-emerald-500 hover:bg-emerald-600',
      description: 'Enregistrer un pilote'
    },
    { 
      label: 'Ajouter Véhicule', 
      icon: Car, 
      onClick: () => navigate('/vehicles'),
      color: 'bg-amber-500 hover:bg-amber-600',
      description: 'Enrichir la flotte'
    },
    { 
      label: 'Nouvelle Dépense', 
      icon: ReceiptText, 
      onClick: () => navigate('/accounting'),
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Saisir une facture'
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Actions Rapides</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Accès direct aux fonctionnalités</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-start p-3 rounded-xl border border-border bg-background/50 hover:border-primary/50 hover:bg-accent transition-all duration-300 group text-left"
          >
            <div className={cn("p-2 rounded-lg mb-2 text-white transition-transform duration-300 group-hover:scale-110", action.color)}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-foreground">{action.label}</span>
            <span className="text-[10px] text-muted-foreground">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
