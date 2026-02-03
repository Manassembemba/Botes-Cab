import { useState } from 'react';
import { useMissions, useDeleteMission, type MissionWithDetails, type Mission } from '@/hooks/useMissions';
import { MissionFormDialog } from '@/components/missions/MissionFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Calendar, MapPin, Car, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { label: string; className: string }> = {
  'Planifiée': { label: 'Planifiée', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  'En cours': { label: 'En cours', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  'Terminée': { label: 'Terminée', className: 'bg-muted text-muted-foreground border-border' },
  'Annulée': { label: 'Annulée', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const statusFilters = [
  { label: 'Toutes', value: 'all' },
  { label: 'Planifiées', value: 'Planifiée' },
  { label: 'En cours', value: 'En cours' },
  { label: 'Terminées', value: 'Terminée' },
  { label: 'Annulées', value: 'Annulée' },
];

export default function Missions() {
  const { data: missions, isLoading, error } = useMissions();
  const deleteMutation = useDeleteMission();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<MissionWithDetails | null>(null);

  const filteredMissions = missions?.filter((mission) => {
    const matchesSearch =
      mission.lieu_depart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.lieu_arrivee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mission.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || mission.statut_mission === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleEdit = (mission: MissionWithDetails) => {
    setEditingMission(mission);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!missionToDelete) return;
    try {
      await deleteMutation.mutateAsync(missionToDelete.mission_id);
      toast({ title: 'Mission supprimée avec succès' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette mission',
        variant: 'destructive'
      });
    }
    setDeleteDialogOpen(false);
    setMissionToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingMission(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Erreur lors du chargement des missions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planification des Missions</h1>
          <p className="text-muted-foreground mt-1">{missions?.length || 0} missions programmées</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle Mission
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground capitalize">{formatDate(selectedDate)}</span>
        </div>
        <button
          onClick={() => navigateDate('next')}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par lieu ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        {filteredMissions.map((mission, index) => {
          const status = statusConfig[mission.statut_mission] || statusConfig['Planifiée'];
          const startTime = new Date(mission.date_depart_prevue);
          const endTime = new Date(mission.date_arrivee_prevue);

          return (
            <div
              key={mission.mission_id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Time Block */}
                <div className="flex items-center gap-4 lg:w-48">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground">
                      {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      → {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Mission Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {mission.client_nom && (
                      <h3 className="font-semibold text-foreground">{mission.client_nom}</h3>
                    )}
                    <Badge variant="outline" className={cn('text-xs', status.className)}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{mission.lieu_depart}</span>
                    <span className="text-primary">→</span>
                    <span>{mission.lieu_arrivee}</span>
                  </div>
                </div>

                {/* Assignment */}
                <div className="flex items-center gap-4 lg:w-auto">
                  {mission.chauffeur && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {mission.chauffeur.prenom[0]}{mission.chauffeur.nom[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {mission.chauffeur.prenom} {mission.chauffeur.nom[0]}.
                      </span>
                    </div>
                  )}

                  {mission.vehicule && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{mission.vehicule.immatriculation}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(mission)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setMissionToDelete(mission);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMissions.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune mission pour cette période</p>
          <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une mission
          </Button>
        </div>
      )}

      <MissionFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        mission={editingMission}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette mission de {missionToDelete?.lieu_depart} vers {missionToDelete?.lieu_arrivee} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
