import { useState } from 'react';
import { useVehicules, useDeleteVehicule, type Vehicule } from '@/hooks/useVehicules';
import { VehiculeFormDialog } from '@/components/vehicules/VehiculeFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, LayoutGrid, List, Pencil, Trash2, Car, Gauge } from 'lucide-react';
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

const statutConfig: Record<string, { label: string; className: string }> = {
  'Libre': { label: 'Libre', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  'Affecté': { label: 'Affecté', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  'Maintenance': { label: 'En maintenance', className: 'bg-status-maintenance/20 text-status-maintenance border-status-maintenance/30' },
  'Hors service': { label: 'Hors service', className: 'bg-status-offline/20 text-status-offline border-status-offline/30' },
};

const statusFilters = [
  { label: 'Tous', value: 'all' },
  { label: 'Libre', value: 'Libre' },
  { label: 'Affecté', value: 'Affecté' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Hors service', value: 'Hors service' },
];

export default function Vehicles() {
  const { data: vehicules, isLoading, error } = useVehicules();
  const deleteMutation = useDeleteVehicule();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehiculeToDelete, setVehiculeToDelete] = useState<Vehicule | null>(null);

  const filteredVehicules = vehicules?.filter((vehicule) => {
    const matchesSearch =
      vehicule.marque.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicule.modele.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicule.immatriculation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicule.statut === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleEdit = (vehicule: Vehicule) => {
    setEditingVehicule(vehicule);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!vehiculeToDelete) return;
    try {
      await deleteMutation.mutateAsync(vehiculeToDelete.vehicule_id);
      toast({ title: 'Véhicule supprimé avec succès' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer ce véhicule (peut être lié à des missions)',
        variant: 'destructive'
      });
    }
    setDeleteDialogOpen(false);
    setVehiculeToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingVehicule(null);
  };

  const revisionSoon = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
        <p className="text-destructive">Erreur lors du chargement des véhicules</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Véhicules</h1>
          <p className="text-muted-foreground mt-1">{vehicules?.length || 0} véhicules dans la flotte</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un Véhicule
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par marque, modèle ou immatriculation..."
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

        <div className="flex items-center gap-1 border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Vehicles Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVehicules.map((vehicule, index) => {
            const status = statutConfig[vehicule.statut] || statutConfig['Libre'];
            const needsRevision = revisionSoon(vehicule.date_prochaine_revision);

            return (
              <div
                key={vehicule.vehicule_id}
                className={cn(
                  'group rounded-xl border bg-card p-5 transition-all duration-200 animate-fade-in',
                  needsRevision && 'border-status-maintenance/50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{vehicule.marque} {vehicule.modele}</h3>
                      <p className="text-sm text-muted-foreground">{vehicule.immatriculation}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span>{vehicule.kilometrage_actuel.toLocaleString()} km</span>
                  </div>
                  {vehicule.annee_achat && (
                    <p className="text-sm text-muted-foreground">Année: {vehicule.annee_achat}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn('text-[10px] uppercase font-bold tracking-wider', status.className)}>
                      {status.label}
                    </Badge>
                    {vehicule.categorie && (
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-none">
                        {vehicule.categorie}
                      </Badge>
                    )}
                  </div>
                </div>

                {needsRevision && vehicule.date_prochaine_revision && (
                  <div className="mb-4 rounded-lg bg-status-maintenance/10 border border-status-maintenance/20 px-3 py-2">
                    <p className="text-xs font-medium text-status-maintenance">
                      Révision prévue le {new Date(vehicule.date_prochaine_revision).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(vehicule)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setVehiculeToDelete(vehicule);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Véhicule</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Immatriculation</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Kilométrage</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Statut</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicules.map((vehicule) => {
                const status = statutConfig[vehicule.statut] || statutConfig['Libre'];
                return (
                  <tr key={vehicule.vehicule_id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{vehicule.marque} {vehicule.modele}</div>
                      <div className="text-sm text-muted-foreground">{vehicule.annee_achat || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{vehicule.immatriculation}</td>
                    <td className="px-4 py-3 text-foreground">{vehicule.kilometrage_actuel.toLocaleString()} km</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={cn('text-[10px] uppercase font-bold tracking-wider', status.className)}>
                          {status.label}
                        </Badge>
                        {vehicule.categorie && (
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-none">
                            {vehicule.categorie}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setVehiculeToDelete(vehicule);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredVehicules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun véhicule trouvé</p>
        </div>
      )}

      <VehiculeFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        vehicule={editingVehicule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {vehiculeToDelete?.marque} {vehiculeToDelete?.modele} ({vehiculeToDelete?.immatriculation}) ?
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
