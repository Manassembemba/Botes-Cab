import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, DollarSign, Star } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type ClientWithStats } from '@/hooks/useClients';

interface ClientHistoryCardProps {
  client: ClientWithStats;
}

export function ClientHistoryCard({ client }: ClientHistoryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {client.prenom ? `${client.prenom} ${client.nom}` : client.nom}
          </CardTitle>
          {client.est_fidele && (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
              Fidèle
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {client.telephone} • {client.email}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{client.nb_missions_total}</div>
            <div className="text-xs text-muted-foreground">Missions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {client.montant_total_depense?.toLocaleString()} {client.devise || 'USD'}
            </div>
            <div className="text-xs text-muted-foreground">Dépensé</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {client.historique_categories?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Catégories</div>
          </div>
        </div>

        <div className="py-3">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Star className="h-4 w-4" />
            Préférences
          </h4>
          <div className="flex flex-wrap gap-2">
            {client.categorie_preferee && (
              <Badge variant="outline" className="text-xs">
                Catégorie: {client.categorie_preferee}
              </Badge>
            )}
            {client.type_course_prefere && (
              <Badge variant="outline" className="text-xs">
                Type: {client.type_course_prefere}
              </Badge>
            )}
          </div>
        </div>

        {client.derniere_mission_date && (
          <div className="py-3">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Dernière mission
            </h4>
            <div className="text-sm">
              {format(new Date(client.derniere_mission_date), 'dd MMM yyyy', { locale: fr })}
            </div>
          </div>
        )}

        <div className="py-3">
          <h4 className="text-sm font-semibold mb-2">Adresse</h4>
          <div className="text-sm text-muted-foreground">
            {client.adresse || 'Non renseignée'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}