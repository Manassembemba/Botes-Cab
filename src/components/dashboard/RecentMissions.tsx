import { useMissions } from '@/hooks/useMissions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MapPin, Clock, User, Car, Loader2 } from 'lucide-react';

export function RecentMissions() {
  const { data: missions, isLoading } = useMissions();
  
  const recentMissions = missions?.slice(0, 4) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Missions Récentes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Les dernières activités de transport</p>
        </div>
        <a href="/missions" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
          Voir tout
        </a>
      </div>

      <div className="space-y-4">
        {recentMissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune mission récente</p>
        ) : (
          recentMissions.map((mission, index) => (
            <div
              key={mission.mission_id}
              className="group rounded-xl border border-border bg-background/30 p-4 hover:border-primary/30 hover:bg-accent/50 transition-all duration-300 animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-foreground truncate">
                      {mission.lieu_depart} → {mission.lieu_destination}
                    </span>
                    <StatusBadge status={mission.statut_mission} className="text-[10px]" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary/60" />
                      <span>{new Date(mission.date_depart_prevue).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {mission.chauffeur && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-primary/60" />
                        <span className="truncate">{mission.chauffeur.prenom} {mission.chauffeur.nom}</span>
                      </div>
                    )}
                    
                    {mission.vehicule && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Car className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium text-foreground/80">{mission.vehicule.immatriculation}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary/60" />
                      <span className="truncate text-[11px]">{mission.distance_estimee || '0'} km • {mission.duree_estimee || '--:--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
