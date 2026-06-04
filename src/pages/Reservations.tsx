import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Search, FileText, ArrowRightLeft, Pencil, Trash2,
  CalendarClock, Car, Users, UserX, CheckCircle2, Clock, XCircle,
  Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useReservations, useDeleteReservation, useConvertReservationToMission,
  type ReservationWithDetails,
} from '@/hooks/useReservations';
import { ReservationFormDialog } from '@/components/reservations/ReservationFormDialog';
import { generateInvoicePDF } from '@/services/invoiceService';

const statutConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  brouillon:              { label: 'Brouillon',           icon: Clock,         className: 'bg-gray-100 text-gray-600 border-gray-200' },
  confirmée:              { label: 'Confirmée',           icon: CheckCircle2,  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_cours:               { label: 'En cours',            icon: CalendarClock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  terminée:               { label: 'Terminée',            icon: CheckCircle2,  className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  annulée:                { label: 'Annulée',             icon: XCircle,       className: 'bg-red-50 text-red-600 border-red-200' },
  convertie_en_mission:   { label: 'Convertie en Mission', icon: ArrowRightLeft, className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const statutFilters = [
  { label: 'Toutes', value: 'all' },
  { label: 'Confirmées', value: 'confirmée' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Brouillons', value: 'brouillon' },
  { label: 'Terminées', value: 'terminée' },
  { label: 'Annulées', value: 'annulée' },
];

export default function Reservations() {
  const { data: reservations, isLoading, error } = useReservations();
  const deleteMutation = useDeleteReservation();
  const convertMutation = useConvertReservationToMission();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReservationWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ReservationWithDetails | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [toConvert, setToConvert] = useState<ReservationWithDetails | null>(null);

  const filtered = reservations?.filter(r => {
    const matchSearch =
      (r.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
      r.lieu_depart.toLowerCase().includes(search.toLowerCase()) ||
      r.lieu_arrivee.toLowerCase().includes(search.toLowerCase()) ||
      (r.vehicule?.immatriculation || '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || r.statut_reservation === statutFilter;
    return matchSearch && matchStatut;
  }) || [];

  const handleEdit = (r: ReservationWithDetails) => { setEditing(r); setFormOpen(true); };
  const handleFormClose = (open: boolean) => { setFormOpen(open); if (!open) setEditing(null); };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.reservation_id);
      toast({ title: 'Réservation supprimée.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setToDelete(null);
  };

  const handleConvert = async () => {
    if (!toConvert) return;
    try {
      const missionId = await convertMutation.mutateAsync(toConvert.reservation_id);
      toast({ title: '✅ Convertie en Mission', description: `Mission #${missionId} créée avec succès.` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    }
    setConvertDialogOpen(false);
    setToConvert(null);
  };

  const handleInvoice = (r: ReservationWithDetails) => {
    try {
      generateInvoicePDF(r);
      toast({ title: '📄 Facture générée', description: `Facture FAC-${String(r.reservation_id).padStart(5, '0')} téléchargée.` });
    } catch {
      toast({ title: 'Erreur PDF', description: 'Impossible de générer la facture.', variant: 'destructive' });
    }
  };

  // Stats rapides
  const stats = {
    total: reservations?.length || 0,
    confirmees: reservations?.filter(r => r.statut_reservation === 'confirmée').length || 0,
    sansDriver: reservations?.filter(r => !r.chauffeur_id && r.statut_reservation === 'confirmée').length || 0,
    revenues: reservations?.filter(r => r.statut_reservation === 'terminée').reduce((s, r) => s + (r.montant_total || 0), 0) || 0,
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="text-center py-12 text-destructive">Erreur lors du chargement des réservations.</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Réservations</h1>
          <p className="text-muted-foreground mt-1">{stats.total} réservation(s) enregistrée(s)</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvelle Réservation
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: CalendarClock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Confirmées', value: stats.confirmees, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Sans chauffeur', value: stats.sansDriver, icon: UserX, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Revenus terminés', value: `${stats.revenues.toLocaleString()} USD`, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.bg)}>
              <s.icon className={cn('h-5 w-5', s.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher client, lieu, immatriculation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statutFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatutFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statutFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Alerte réservations sans chauffeur */}
      {stats.sansDriver > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {stats.sansDriver} réservation(s) confirmée(s) sans chauffeur affecté
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Modifiez ces réservations pour affecter un chauffeur ou convertissez-les en mission.
            </p>
          </div>
        </div>
      )}

      {/* Liste des réservations */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Client</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Itinéraire</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Dates</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Véhicule</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Chauffeur</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Montant</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Statut</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucune réservation trouvée.
                  </td>
                </tr>
              ) : filtered.map((r, idx) => {
                const conf = statutConfig[r.statut_reservation] || statutConfig['brouillon'];
                const Icon = conf.icon;
                const canConvert = ['confirmée', 'en_cours'].includes(r.statut_reservation);
                const canEdit = !['annulée', 'convertie_en_mission'].includes(r.statut_reservation);
                const solde = (r.montant_total || 0) - (r.acompte || 0);

                return (
                  <tr key={r.reservation_id} className="hover:bg-accent/30 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-foreground">
                        {r.client_nom || (r.client ? `${r.client.titre || ''} ${r.client.nom}`.trim() : 'Inconnu')}
                      </div>
                      {r.type_course && <div className="text-xs text-muted-foreground">{r.type_course}</div>}
                    </td>
                    {/* Itinéraire */}
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-medium text-foreground">{r.lieu_depart}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="font-medium text-foreground">{r.lieu_arrivee}</span>
                      </div>
                    </td>
                    {/* Dates */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{format(new Date(r.date_depart_prevue), 'dd/MM/yy HH:mm', { locale: fr })}</div>
                      <div className="text-muted-foreground/70">→ {format(new Date(r.date_arrivee_prevue), 'dd/MM/yy HH:mm', { locale: fr })}</div>
                    </td>
                    {/* Véhicule */}
                    <td className="px-4 py-3">
                      {r.vehicule ? (
                        <div className="flex items-center gap-1.5">
                          <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="text-xs">
                            <div className="font-medium text-foreground">{r.vehicule.immatriculation}</div>
                            <div className="text-muted-foreground">{r.vehicule.marque} {r.vehicule.modele}</div>
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    {/* Chauffeur */}
                    <td className="px-4 py-3">
                      {r.chauffeur ? (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground">{r.chauffeur.prenom} {r.chauffeur.nom}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 gap-1">
                          <UserX className="h-3 w-3" /> À affecter
                        </Badge>
                      )}
                    </td>
                    {/* Montant */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-foreground">{(r.montant_total || 0).toLocaleString()} {r.devise}</div>
                      {solde > 0 && <div className="text-red-500">Solde : {solde.toLocaleString()}</div>}
                      {solde <= 0 && r.montant_total! > 0 && <div className="text-emerald-600">Soldé ✓</div>}
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-[10px] gap-1', conf.className)}>
                        <Icon className="h-3 w-3" />
                        {conf.label}
                      </Badge>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Facture */}
                        <Button variant="ghost" size="sm" title="Générer la facture PDF" onClick={() => handleInvoice(r)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <FileText className="h-4 w-4" />
                        </Button>
                        {/* Convertir en mission */}
                        {canConvert && (
                          <Button variant="ghost" size="sm" title="Convertir en Mission" onClick={() => { setToConvert(r); setConvertDialogOpen(true); }} className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Modifier */}
                        {canEdit && (
                          <Button variant="ghost" size="sm" title="Modifier" onClick={() => handleEdit(r)} className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Supprimer */}
                        <Button variant="ghost" size="sm" title="Supprimer" onClick={() => { setToDelete(r); setDeleteDialogOpen(true); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
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
      </div>

      {/* Dialogs */}
      <ReservationFormDialog open={formOpen} onOpenChange={handleFormClose} reservation={editing} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer la réservation de <strong>{toDelete?.client_nom || 'ce client'}</strong> ({toDelete?.lieu_depart} → {toDelete?.lieu_arrivee}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir en Mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              La réservation <strong>#{toConvert?.reservation_id}</strong> sera convertie en une mission opérationnelle.
              {!toConvert?.chauffeur_id && (
                <span className="block mt-2 text-amber-600 font-medium">⚠️ Aucun chauffeur n'est affecté. La mission sera créée sans chauffeur.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert} className="bg-purple-600 hover:bg-purple-700 text-white">
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Convertir en Mission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
