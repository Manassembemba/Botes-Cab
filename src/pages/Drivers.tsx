import { useState } from 'react';
import { useChauffeurs, useDeleteChauffeur, type Chauffeur } from '@/hooks/useChauffeurs';
import { ChauffeurFormDialog } from '@/components/chauffeurs/ChauffeurFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, LayoutGrid, List, Phone, Pencil, Trash2 } from 'lucide-react';
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

const disponibiliteConfig: Record<string, { label: string; className: string }> = {
  'Disponible': { label: 'Disponible', className: 'bg-status-available/20 text-status-available border-status-available/30' },
  'En mission': { label: 'En mission', className: 'bg-status-assigned/20 text-status-assigned border-status-assigned/30' },
  'Repos': { label: 'Repos', className: 'bg-muted text-muted-foreground border-border' },
  'Congé maladie': { label: 'Congé maladie', className: 'bg-status-maintenance/20 text-status-maintenance border-status-maintenance/30' },
};

const statusFilters = [
  { label: 'Tous', value: 'all' },
  { label: 'Disponible', value: 'Disponible' },
  { label: 'En mission', value: 'En mission' },
  { label: 'Repos', value: 'Repos' },
  { label: 'Congé maladie', value: 'Congé maladie' },
];

export default function Drivers() {
  const { data: chauffeurs, isLoading, error } = useChauffeurs();
  const deleteMutation = useDeleteChauffeur();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingChauffeur, setEditingChauffeur] = useState<Chauffeur | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chauffeurToDelete, setChauffeurToDelete] = useState<Chauffeur | null>(null);

  const filteredChauffeurs = chauffeurs?.filter((chauffeur) => {
    const matchesSearch =
      chauffeur.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chauffeur.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chauffeur.tel?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || chauffeur.disponibilite === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleEdit = (chauffeur: Chauffeur) => {
    setEditingChauffeur(chauffeur);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!chauffeurToDelete) return;
    try {
      await deleteMutation.mutateAsync(chauffeurToDelete.chauffeur_id);
      toast({ title: 'Chauffeur supprimé avec succès' });
    } catch (error) {
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de supprimer ce chauffeur (peut être lié à des missions)',
        variant: 'destructive' 
      });
    }
    setDeleteDialogOpen(false);
    setChauffeurToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingChauffeur(null);
  };

  const licenseExpiringSoon = (date: string) => {
    return new Date(date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
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
        <p className="text-destructive">Erreur lors du chargement des chauffeurs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Chauffeurs</h1>
          <p className="text-muted-foreground mt-1">{chauffeurs?.length || 0} chauffeurs actifs</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un Chauffeur
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par nom ou téléphone..."
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

      {/* Chauffeurs Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredChauffeurs.map((chauffeur, index) => {
            const status = disponibiliteConfig[chauffeur.disponibilite] || disponibiliteConfig['Disponible'];
            const initials = `${chauffeur.prenom[0]}${chauffeur.nom[0]}`;
            const expiringSoon = licenseExpiringSoon(chauffeur.permis_exp_date);
            
            return (
              <div
                key={chauffeur.chauffeur_id}
                className={cn(
                  'group rounded-xl border bg-card p-5 transition-all duration-200 animate-fade-in',
                  expiringSoon && 'border-status-maintenance/50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{chauffeur.prenom} {chauffeur.nom}</h3>
                      <p className="text-sm text-muted-foreground">
                        Embauché le {new Date(chauffeur.date_embauche).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {chauffeur.tel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{chauffeur.tel}</span>
                    </div>
                  )}
                  <Badge variant="outline" className={cn('text-xs', status.className)}>
                    {status.label}
                  </Badge>
                </div>

                {expiringSoon && (
                  <div className="mb-4 rounded-lg bg-status-maintenance/10 border border-status-maintenance/20 px-3 py-2">
                    <p className="text-xs font-medium text-status-maintenance">
                      Permis expire le {new Date(chauffeur.permis_exp_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(chauffeur)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setChauffeurToDelete(chauffeur);
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
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Chauffeur</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Contact</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Permis</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Statut</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredChauffeurs.map((chauffeur) => {
                const status = disponibiliteConfig[chauffeur.disponibilite] || disponibiliteConfig['Disponible'];
                return (
                  <tr key={chauffeur.chauffeur_id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                          {chauffeur.prenom[0]}{chauffeur.nom[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{chauffeur.prenom} {chauffeur.nom}</div>
                          <div className="text-sm text-muted-foreground">
                            Depuis {new Date(chauffeur.date_embauche).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground">{chauffeur.tel || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn(
                        "text-sm",
                        licenseExpiringSoon(chauffeur.permis_exp_date) ? "text-status-maintenance font-medium" : "text-foreground"
                      )}>
                        Expire: {new Date(chauffeur.permis_exp_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-xs', status.className)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(chauffeur)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setChauffeurToDelete(chauffeur);
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

      {filteredChauffeurs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun chauffeur trouvé</p>
        </div>
      )}

      <ChauffeurFormDialog 
        open={formOpen} 
        onOpenChange={handleFormClose}
        chauffeur={editingChauffeur}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {chauffeurToDelete?.prenom} {chauffeurToDelete?.nom} ? 
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
