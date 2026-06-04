import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useVehicules } from '@/hooks/useVehicules';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useClients } from '@/hooks/useClients';
import { useTarifs } from '@/hooks/useTarifs';
import { useCreateReservation, useUpdateReservation, useCreateReservationWithTransaction, type Reservation, type ReservationInsert } from '@/hooks/useReservations';
import { Info, AlertCircle, UserX, Plus, CreditCard, Banknote, Landmark } from 'lucide-react';
import { generateInvoicePDF } from '@/services/invoiceService';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { getIconForMethod } from '@/lib/paymentUtils';

const courseTypeOptions = [
  { value: 'Transfert Aéroport', label: 'Transfert Aéroport' },
  { value: 'Course Urbaine', label: 'Course Urbaine' },
  { value: 'Mise à disposition (Journée)', label: 'Mise à disposition (Journée)' },
  { value: 'Voyage Interurbain', label: 'Voyage Interurbain' },
];

const deviseOptions = [
  { value: 'USD', label: 'USD — Dollar' },
  { value: 'CDF', label: 'CDF — Franc Congolais' },
];

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation | null;
}

export function ReservationFormDialog({ open, onOpenChange, reservation }: ReservationFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateReservationWithTransaction();
  const updateMutation = useUpdateReservation();

  const { data: vehicules } = useVehicules();
  const { data: chauffeurs } = useChauffeurs();
  const { data: clients } = useClients();
  const { data: tarifs } = useTarifs();
  const { data: paymentMethods } = usePaymentMethods();

  const defaultForm: ReservationInsert = {
    vehicule_id: 0,
    chauffeur_id: null,
    client_id: null,
    client_nom: '',
    lieu_depart: '',
    lieu_arrivee: '',
    date_depart_prevue: '',
    date_arrivee_prevue: '',
    date_depart_reelle: null,
    date_arrivee_reelle: null,
    statut_reservation: 'confirmée',
    type_course: 'Course Urbaine',
    montant_total: 0,
    acompte: 0,
    solde: 0,
    devise: 'USD',
    methode_paiement: 'Cash',
    notes: '',
  };

  const [form, setForm] = useState<ReservationInsert>(defaultForm);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (reservation) {
        setForm({
          vehicule_id: reservation.vehicule_id,
          chauffeur_id: reservation.chauffeur_id,
          client_id: reservation.client_id,
          client_nom: reservation.client_nom || '',
          lieu_depart: reservation.lieu_depart,
          lieu_arrivee: reservation.lieu_arrivee,
          date_depart_prevue: reservation.date_depart_prevue.slice(0, 16),
          date_arrivee_prevue: reservation.date_arrivee_prevue.slice(0, 16),
          date_depart_reelle: reservation.date_depart_reelle,
          date_arrivee_reelle: reservation.date_arrivee_reelle,
          statut_reservation: reservation.statut_reservation,
          type_course: reservation.type_course || 'Course Urbaine',
          montant_total: reservation.montant_total || 0,
          acompte: reservation.acompte || 0,
          solde: reservation.solde || 0,
          devise: reservation.devise || 'USD',
          methode_paiement: reservation.methode_paiement || 'Cash',
          notes: reservation.notes || '',
        });
      } else {
        setForm(defaultForm);
        setSelectedPaymentMethodId('');
      }
    }
  }, [open, reservation]);

  // Calcul automatique du solde
  useEffect(() => {
    const total = Number(form.montant_total) || 0;
    const acompte = Number(form.acompte) || 0;
    setForm(prev => ({ ...prev, solde: total - acompte }));
  }, [form.montant_total, form.acompte]);

  // Calcul automatique du tarif selon véhicule + type de course
  useEffect(() => {
    if (reservation) return;
    if (!form.vehicule_id || !form.type_course || !tarifs || !vehicules) return;
    const veh = vehicules.find(v => v.vehicule_id === form.vehicule_id);
    if (!veh) return;
    const tarif = tarifs.find(t => t.categorie === veh.categorie && t.type_course === form.type_course);
    if (tarif) {
      setForm(prev => ({ ...prev, montant_total: Number(tarif.prix_base), devise: tarif.devise || prev.devise }));
    }
  }, [form.vehicule_id, form.type_course, tarifs, vehicules, reservation]);

  const handleClientSelect = (value: string) => {
    const client = clients?.find(c => c.client_id.toString() === value);
    setForm(prev => ({
      ...prev,
      client_id: client ? client.client_id : null,
      client_nom: client ? `${client.titre || ''} ${client.nom} ${client.prenom || ''}`.trim() : prev.client_nom,
    }));
  };

  const handleChauffeurSelect = (value: string) => {
    setForm(prev => ({
      ...prev,
      chauffeur_id: value === 'none' ? null : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vehicule_id || form.vehicule_id === 0) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un véhicule.', variant: 'destructive' });
      return;
    }
    if (!form.lieu_depart || !form.lieu_arrivee) {
      toast({ title: 'Erreur', description: 'Les lieux de départ et d\'arrivée sont requis.', variant: 'destructive' });
      return;
    }
    if (!form.date_depart_prevue || !form.date_arrivee_prevue) {
      toast({ title: 'Erreur', description: 'Les dates sont requises.', variant: 'destructive' });
      return;
    }

    // Validation paiement si acompte > 0 en création
    if (!reservation && form.acompte && form.acompte > 0 && !selectedPaymentMethodId) {
      toast({
        title: 'Paiement requis',
        description: 'Veuillez sélectionner une méthode de paiement pour l\'acompte.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (reservation) {
        await updateMutation.mutateAsync({ id: reservation.reservation_id, ...form });
        toast({ title: '✅ Réservation modifiée avec succès' });
      } else {
        const newReservation = await createMutation.mutateAsync({
          reservationData: form,
          paymentAmount: form.acompte || 0,
          paymentMethodId: selectedPaymentMethodId ? parseInt(selectedPaymentMethodId) : null
        });
        
        toast({ 
          title: '✅ Réservation créée & Encaissée', 
          description: form.chauffeur_id ? 'Chauffeur affecté.' : 'Aucun chauffeur — à affecter ultérieurement.' 
        });
        
        // Générer la facture PDF automatiquement
        try {
          generateInvoicePDF(newReservation);
          toast({ title: '📄 Facture générée', description: 'Le PDF a été téléchargé.' });
        } catch (pdfErr) {
          console.error("Erreur génération PDF:", pdfErr);
        }
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message || 'Une erreur est survenue.', variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reservation ? 'Modifier la réservation' : 'Nouvelle Réservation'}</DialogTitle>
          <DialogDescription>
            Le chauffeur est <strong>optionnel</strong> — vous pouvez l'affecter plus tard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section 1 : Client */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Client
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Client existant</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-primary"
                    onClick={() => setClientFormOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nouveau
                  </Button>
                </div>
                <Select value={form.client_id?.toString() || ''} onValueChange={handleClientSelect}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => (
                      <SelectItem key={c.client_id} value={c.client_id.toString()}>
                        {c.titre} {c.nom} {c.prenom} ({c.telephone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="client_nom">Nom du client (libre)</Label>
                <Input
                  id="client_nom"
                  value={form.client_nom || ''}
                  onChange={e => setForm(prev => ({ ...prev, client_nom: e.target.value }))}
                  placeholder="Ex: M. Dupont"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Itinéraire & Dates */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Itinéraire & Dates
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Lieu de départ *</Label>
                <Input value={form.lieu_depart} onChange={e => setForm(p => ({ ...p, lieu_depart: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Lieu d'arrivée *</Label>
                <Input value={form.lieu_arrivee} onChange={e => setForm(p => ({ ...p, lieu_arrivee: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Date & heure de départ *</Label>
                <Input type="datetime-local" value={form.date_depart_prevue} onChange={e => setForm(p => ({ ...p, date_depart_prevue: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Date & heure de retour *</Label>
                <Input type="datetime-local" value={form.date_arrivee_prevue} onChange={e => setForm(p => ({ ...p, date_arrivee_prevue: e.target.value }))} required />
              </div>
            </div>
          </div>

          {/* Section 3 : Véhicule & Chauffeur */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
              Ressources
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type de prestation</Label>
                <Select value={form.type_course || ''} onValueChange={v => setForm(p => ({ ...p, type_course: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {courseTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Véhicule *</Label>
                <Select value={form.vehicule_id?.toString() || ''} onValueChange={v => setForm(p => ({ ...p, vehicule_id: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {vehicules?.map(v => (
                      <SelectItem key={v.vehicule_id} value={v.vehicule_id.toString()}>
                        {v.immatriculation} — {v.marque} {v.modele}
                        {v.categorie && <Badge variant="secondary" className="ml-2 text-[10px]">{v.categorie}</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chauffeur — optionnel */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                Chauffeur
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Optionnel</Badge>
              </Label>
              <Select value={form.chauffeur_id?.toString() || 'none'} onValueChange={handleChauffeurSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun chauffeur — à affecter plus tard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserX className="h-4 w-4" />
                      Aucun chauffeur (à affecter plus tard)
                    </div>
                  </SelectItem>
                  {chauffeurs?.map(c => (
                    <SelectItem key={c.chauffeur_id} value={c.chauffeur_id.toString()}>
                      {c.prenom} {c.nom} — {c.disponibilite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.chauffeur_id && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  Sans chauffeur, la réservation devra être convertie en mission pour l'exécution.
                </p>
              )}
            </div>
          </div>

          {/* Section 4 : Tarif */}
          <div className="space-y-3 p-4 border rounded-lg bg-emerald-50/50 border-emerald-200">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">4</span>
              Tarification & Paiement
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Montant total</Label>
                <Input type="number" min="0" value={form.montant_total || ''} onChange={e => setForm(p => ({ ...p, montant_total: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Devise</Label>
                <Select value={form.devise || 'USD'} onValueChange={v => setForm(p => ({ ...p, devise: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {deviseOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Acompte versé</Label>
                <Input type="number" min="0" value={form.acompte || ''} onChange={e => setForm(p => ({ ...p, acompte: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Moyen de paiement</Label>
                <Select 
                  value={selectedPaymentMethodId} 
                  onValueChange={setSelectedPaymentMethodId}
                  disabled={!form.acompte || form.acompte <= 0}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir moyen..." /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.map(method => (
                      <SelectItem key={method.method_id} value={method.method_id.toString()}>
                        <div className="flex items-center gap-2">
                          {getIconForMethod(method.label)}
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(form.montant_total || 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <Info className="h-3.5 w-3.5" />
                Solde restant : <strong>{((form.montant_total || 0) - (form.acompte || 0)).toLocaleString()} {form.devise}</strong>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes / Instructions spéciales</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Ex: Accueil VIP, bagages supplémentaires..." />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending} className="min-w-[160px]">
              {isPending ? 'Enregistrement...' : reservation ? 'Enregistrer les modifications' : '📋 Créer la Réservation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Dialogue pour créer un nouveau client */}
      <ClientFormDialog 
        open={clientFormOpen} 
        onOpenChange={setClientFormOpen}
        onClientCreated={(newClient) => {
          setForm(prev => ({
            ...prev,
            client_id: newClient.client_id,
            client_nom: `${newClient.nom} ${newClient.prenom || ''}`.trim()
          }));
        }}
      />
    </Dialog>
  );
}
