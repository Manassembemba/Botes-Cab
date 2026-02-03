import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMissionTransaction } from '@/hooks/useCreateMissionTransaction';
import { useUpdateMission, type Mission, type MissionInsert } from '@/hooks/useMissions';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useVehicules } from '@/hooks/useVehicules';
import { useAvailableChauffeursInRange } from '@/hooks/useAvailableChauffeurs';
import { useAvailableVehiculesInRange } from '@/hooks/useAvailableVehicules';
import { useTarifs } from '@/hooks/useTarifs';
import { useToast } from '@/hooks/use-toast';
import { Info, AlertCircle, CreditCard, Banknote, Landmark } from 'lucide-react';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { Badge } from '@/components/ui/badge';

interface MissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: Mission | null;
}

const statutOptions = [
  { value: 'Planifiée', label: 'Planifiée' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Terminée', label: 'Terminée' },
  { value: 'Annulée', label: 'Annulée' },
];

const courseTypeOptions = [
  { value: 'Transfert Aéroport', label: 'Transfert Aéroport' },
  { value: 'Course Urbaine', label: 'Course Urbaine' },
  { value: 'Mise à disposition (Journée)', label: 'Mise à disposition (Journée)' },
  { value: 'Voyage Interurbain', label: 'Voyage Interurbain' },
];

export function MissionFormDialog({ open, onOpenChange, mission }: MissionFormDialogProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<MissionInsert>({
    chauffeur_id: 0,
    vehicule_id: 0,
    client_nom: '',
    lieu_depart: '',
    lieu_arrivee: '',
    date_depart_prevue: '',
    date_arrivee_prevue: '',
    statut_mission: 'Planifiée',
    montant_total: 0,
    acompte: 0,
    solde: 0,
    devise: 'USD',
    kilometrage_fin: null,
    type_course: 'Course Urbaine',
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const { data: chauffeurs } = useChauffeurs();
  const { data: vehicules } = useVehicules();
  const { data: paymentMethods } = usePaymentMethods();

  // Utiliser les hooks de disponibilité par plage si les dates sont définies
  const { data: availableChauffeurs } = useAvailableChauffeursInRange(
    formData.date_depart_prevue,
    formData.date_arrivee_prevue
  );

  const { data: availableVehicules } = useAvailableVehiculesInRange(
    formData.date_depart_prevue,
    formData.date_arrivee_prevue
  );

  const { data: tarifs } = useTarifs();
  const createTransactionMutation = useCreateMissionTransaction();
  const updateMutation = useUpdateMission();
  const isEditing = !!mission;

  // En mode édition, on affiche toutes les ressources.
  const chauffeursList = isEditing
    ? chauffeurs
    : (formData.date_depart_prevue && formData.date_arrivee_prevue && availableChauffeurs)
      ? availableChauffeurs
      : chauffeurs;

  const vehiculesList = isEditing
    ? vehicules
    : (formData.date_depart_prevue && formData.date_arrivee_prevue && availableVehicules)
      ? availableVehicules
      : vehicules;



  useEffect(() => {
    if (mission) {
      setFormData({
        chauffeur_id: mission.chauffeur_id,
        vehicule_id: mission.vehicule_id,
        client_nom: mission.client_nom || '',
        lieu_depart: mission.lieu_depart,
        lieu_arrivee: mission.lieu_arrivee,
        date_depart_prevue: mission.date_depart_prevue.slice(0, 16),
        date_arrivee_prevue: mission.date_arrivee_prevue.slice(0, 16),
        statut_mission: mission.statut_mission,
        montant_total: mission.montant_total || 0,
        acompte: mission.acompte || 0,
        solde: mission.solde || 0,
        devise: mission.devise || 'USD',
        kilometrage_fin: mission.kilometrage_fin,
        type_course: mission.type_course || 'Course Urbaine',
      });
      // En édition, on ne gère pas le paiement initial ici, c'est fait
    } else {
      setFormData({
        chauffeur_id: 0,
        vehicule_id: 0,
        client_nom: '',
        lieu_depart: '',
        lieu_arrivee: '',
        date_depart_prevue: '',
        date_arrivee_prevue: '',
        statut_mission: 'Planifiée',
        montant_total: 0,
        acompte: 0, // Par défaut 0
        solde: 0,
        devise: 'USD',
        kilometrage_fin: null,
        type_course: 'Course Urbaine',
      });
      setSelectedPaymentMethod('');
    }
  }, [mission, open]);

  // Calcul automatique du solde
  useEffect(() => {
    const total = Number(formData.montant_total) || 0;
    const acompt = Number(formData.acompte) || 0;
    setFormData(prev => ({ ...prev, solde: total - acompt }));
  }, [formData.montant_total, formData.acompte]);

  // Calcul automatique du tarif basé sur la catégorie du véhicule et le type de course
  useEffect(() => {
    if (isEditing) return; // Ne pas écraser le prix en édition
    if (!formData.vehicule_id || !formData.type_course || !tarifs || !vehicules) return;

    const selectedVehicule = vehicules.find(v => v.vehicule_id === formData.vehicule_id);
    if (!selectedVehicule) return;

    const tarif = tarifs.find(t =>
      t.categorie === selectedVehicule.categorie &&
      t.type_course === formData.type_course
    );

    if (tarif) {
      setFormData(prev => ({
        ...prev,
        montant_total: Number(tarif.prix_base),
        devise: tarif.devise || prev.devise,
        // Si on a un acompte pré-saisi qui dépasse le nouveau total, on le reset ou on le garde ?
        // On le garde pour l'instant, le solde s'ajustera
      }));
    }
  }, [formData.vehicule_id, formData.type_course, tarifs, vehicules, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chauffeur_id || !formData.vehicule_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un chauffeur et un véhicule',
        variant: 'destructive'
      });
      return;
    }

    // Validation paiement si acompte > 0 en création
    if (!isEditing && formData.acompte && formData.acompte > 0 && !selectedPaymentMethod) {
      toast({
        title: 'Paiement requis',
        description: 'Veuillez sélectionner une méthode de paiement pour l\'acompte.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isEditing && mission) {
        await updateMutation.mutateAsync({ id: mission.mission_id, ...formData });
        toast({ title: 'Mission modifiée avec succès' });
      } else {
        // En création, on utilise la transaction
        await createTransactionMutation.mutateAsync({
          missionData: formData,
          paymentAmount: formData.acompte || 0,
          paymentMethodId: selectedPaymentMethod ? parseInt(selectedPaymentMethod) : null
        });
        toast({
          title: 'Mission créée et encaissée',
          description: formData.acompte && formData.acompte > 0
            ? `Mission créée avec un paiement de ${formData.acompte} ${formData.devise}`
            : 'Mission créée avec succès'
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur submission:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
  };

  const getIconForMethod = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('cash') || l.includes('espèce')) return <Banknote className="h-4 w-4" />;
    if (l.includes('virement') || l.includes('bank')) return <Landmark className="h-4 w-4" />;
    return <CreditCard className="h-4 w-4" />; // M-Pesa etc
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la mission' : 'Nouvelle Réservation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1 : Details Course */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Détails de la course
            </h3>

            <div className="space-y-2">
              <Label htmlFor="client_nom">Client</Label>
              <Input
                id="client_nom"
                value={formData.client_nom || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
                placeholder="Nom du client"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_depart_prevue">Départ</Label>
                <Input
                  id="date_depart_prevue"
                  type="datetime-local"
                  value={formData.date_depart_prevue}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_depart_prevue: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_arrivee_prevue">Arrivée (Retour)</Label>
                <Input
                  id="date_arrivee_prevue"
                  type="datetime-local"
                  value={formData.date_arrivee_prevue}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_arrivee_prevue: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lieu_depart">Lieu de départ</Label>
                <Input
                  id="lieu_depart"
                  value={formData.lieu_depart}
                  onChange={(e) => setFormData(prev => ({ ...prev, lieu_depart: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lieu_arrivee">Lieu d'arrivée</Label>
                <Input
                  id="lieu_arrivee"
                  value={formData.lieu_arrivee}
                  onChange={(e) => setFormData(prev => ({ ...prev, lieu_arrivee: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Ressources & Tarif */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Véhicule & Tarif
            </h3>

            <div className="space-y-2">
              <Label htmlFor="type_course">Type de prestation</Label>
              <Select
                value={formData.type_course || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type_course: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type de course pour calculer le prix" />
                </SelectTrigger>
                <SelectContent>
                  {courseTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicule_id">Véhicule</Label>
                <Select
                  value={formData.vehicule_id?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicule_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculesList?.map((vehicule) => (
                      <SelectItem key={vehicule.vehicule_id} value={vehicule.vehicule_id.toString()}>
                        {vehicule.marque} {vehicule.modele} <span className="text-muted-foreground text-xs">({vehicule.categorie})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chauffeur_id">Chauffeur</Label>
                <Select
                  value={formData.chauffeur_id?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, chauffeur_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {chauffeursList?.map((chauffeur) => (
                      <SelectItem key={chauffeur.chauffeur_id} value={chauffeur.chauffeur_id.toString()}>
                        {chauffeur.prenom} {chauffeur.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 p-3 bg-secondary/20 rounded-lg flex flex-col items-center justify-center border border-secondary/50">
                <span className="text-xs text-muted-foreground uppercase font-bold">Total à Payer</span>
                <span className="text-2xl font-bold text-primary">
                  {formData.montant_total?.toLocaleString()} {formData.devise}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3 : Paiement (Seulement en création) */}
          {!isEditing && (
            <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs">3</span>
                Encaissement Immédiat
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acompte">Montant perçu maintenant</Label>
                  <div className="relative">
                    <Input
                      id="acompte"
                      type="number"
                      value={formData.acompte || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, acompte: parseFloat(e.target.value) }))}
                      className="pr-16 font-bold"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm font-medium">
                      {formData.devise}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Méthode de paiement</Label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={setSelectedPaymentMethod}
                    disabled={!formData.acompte || formData.acompte <= 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir moyen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods?.map((method) => (
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

              {formData.acompte !== undefined && formData.acompte > 0 && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium animate-in fade-in slide-in-from-top-1">
                  <Info className="h-3 w-3" />
                  Une transaction de {formData.acompte} {formData.devise} sera enregistrée en Caisse.
                </div>
              )}
              {formData.acompte !== undefined && formData.acompte < (formData.montant_total || 0) && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Reste à payer (Solde) : {((formData.montant_total || 0) - (formData.acompte || 0)).toLocaleString()} {formData.devise}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createTransactionMutation.isPending || updateMutation.isPending}
              className="min-w-[150px]"
            >
              {createTransactionMutation.isPending || updateMutation.isPending ? (
                "Traitement..."
              ) : isEditing ? (
                "Enregistrer modifs"
              ) : (
                formData.acompte && formData.acompte > 0 ? `Encaisser & Réserver` : "Réserver (Crédit)"
              )}
            </Button>
          </div>
        </form>
      </DialogContent >
    </Dialog >
  );
}
