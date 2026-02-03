import { useState } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRemboursements, Remboursement, RemboursementFormData } from '@/hooks/useRemboursements';
import { RemboursementFormDialog } from '@/components/remboursements/RemboursementFormDialog';
import { RemboursementStatusBadge } from '@/components/remboursements/RemboursementStatusBadge';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Remboursements() {
  const { remboursements, isLoading, stats, createRemboursement, updateRemboursement, deleteRemboursement } = useRemboursements();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRemboursement, setSelectedRemboursement] = useState<Remboursement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [remboursementToDelete, setRemboursementToDelete] = useState<Remboursement | null>(null);

  const filteredRemboursements = remboursements.filter((r) =>
    r.client_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.motif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedRemboursement(null);
    setDialogOpen(true);
  };

  const handleEdit = (remboursement: Remboursement) => {
    setSelectedRemboursement(remboursement);
    setDialogOpen(true);
  };

  const handleSubmit = (data: RemboursementFormData) => {
    if (selectedRemboursement) {
      updateRemboursement.mutate(
        { id: selectedRemboursement.remboursement_id, updates: data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createRemboursement.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDeleteClick = (remboursement: Remboursement) => {
    setRemboursementToDelete(remboursement);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (remboursementToDelete) {
      deleteRemboursement.mutate(remboursementToDelete.remboursement_id);
      setDeleteDialogOpen(false);
      setRemboursementToDelete(null);
    }
  };

  const statCards = [
    { label: 'Total demandes', value: stats.total, icon: DollarSign, color: 'bg-primary/10 text-primary' },
    { label: 'En attente', value: stats.enAttente, icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
    { label: 'Approuvés', value: stats.approuves, icon: CheckCircle, color: 'bg-green-500/10 text-green-600' },
    { label: 'Refusés', value: stats.refuses, icon: XCircle, color: 'bg-red-500/10 text-red-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Remboursements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les demandes de remboursement des clients
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Montant Total */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Montant total des demandes</p>
            <p className="text-3xl font-bold text-foreground">${stats.montantTotal.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Montant approuvé/remboursé</p>
            <p className="text-3xl font-bold text-status-available">${stats.montantApprouve.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par client ou motif..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Motif</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date demande</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Mission</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRemboursements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune demande de remboursement trouvée
                  </td>
                </tr>
              ) : (
                filteredRemboursements.map((remboursement) => (
                  <tr key={remboursement.remboursement_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{remboursement.client_nom}</td>
                    <td className="px-4 py-3 text-foreground font-semibold">${Number(remboursement.montant).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{remboursement.motif}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(remboursement.date_demande), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <RemboursementStatusBadge status={remboursement.statut} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {remboursement.mission ? (
                        <span>{remboursement.mission.lieu_depart} → {remboursement.mission.lieu_arrivee}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(remboursement)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(remboursement)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <RemboursementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        remboursement={selectedRemboursement}
        onSubmit={handleSubmit}
        isLoading={createRemboursement.isPending || updateRemboursement.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette demande de remboursement de {remboursementToDelete?.client_nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
