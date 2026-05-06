import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useCreateMissionTransaction } from '@/hooks/useCreateMissionTransaction';
import { useUpdateMission, type Mission, type MissionInsert } from '@/hooks/useMissions';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useVehicules } from '@/hooks/useVehicules';
import { useAvailableChauffeursInRange } from '@/hooks/useAvailableChauffeurs';
import { useAvailableVehiculesInRange } from '@/hooks/useAvailableVehicules';
import { useTarifs } from '@/hooks/useTarifs';
import { useToast } from '@/hooks/use-toast';
import { Info, AlertCircle, CreditCard, Banknote, Landmark, Calendar, Clock, Plus } from 'lucide-react';
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
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useClients } from '@/hooks/useClients';
import { useVehiculeAvailability, useChauffeurAvailability } from '@/hooks/useAvailability';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { cn } from '@/lib/utils';

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

const formSchema = z.object({
  chauffeur_id: z.number().min(1, 'Veuillez sélectionner un chauffeur'),
  vehicule_id: z.number().min(1, 'Veuillez sélectionner un véhicule'),
  client_nom: z.string().min(1, 'Le nom du client est requis'),
  lieu_depart: z.string().min(1, 'Le lieu de départ est requis'),
  lieu_arrivee: z.string().min(1, 'Le lieu d\'arrivée est requis'),
  date_depart_prevue: z.string().min(1, 'La date de départ est requise'),
  date_arrivee_prevue: z.string().min(1, 'La date d\'arrivée est requise'),
  statut_mission: z.string().min(1, 'Le statut est requis'),
  montant_total: z.number().min(0, 'Le montant total doit être positif'),
  acompte: z.number().min(0, 'L\'acompte doit être positif'),
  solde: z.number().min(0, 'Le solde doit être positif'),
  devise: z.string().min(1, 'La devise est requise'),
  kilometrage_fin: z.number().nullable(),
  type_course: z.string().min(1, 'Le type de course est requis'),
}).refine((data) => {
  const start = new Date(data.date_depart_prevue);
  const end = new Date(data.date_arrivee_prevue);
  return end > start;
}, {
  message: "La date de retour doit être après la date de départ",
  path: ["date_arrivee_prevue"],
});

interface MissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: Mission | null;
  onOpenClientForm?: () => void; // Fonction pour ouvrir le formulaire client
}

export function MissionFormDialog({ open, onOpenChange, mission, onOpenClientForm }: MissionFormDialogProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<MissionInsert>({
    chauffeur_id: 0,
    vehicule_id: 0,
    client_id: null, // Nouveau champ pour l'ID du client
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
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);

  const { data: chauffeurs } = useChauffeurs();
  const { data: vehicules } = useVehicules();
  const { data: tarifs } = useTarifs();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: clients } = useClients();

  // Hooks pour la création et la mise à jour des missions
  const createMutation = useCreateMissionTransaction();
  const updateMutation = useUpdateMission();

  // Utiliser les hooks de disponibilité par plage
  const { data: availableChauffeurs } = useAvailableChauffeursInRange(
    formData.date_depart_prevue,
    formData.date_arrivee_prevue
  );

  const { data: availableVehicules } = useAvailableVehiculesInRange(
    formData.date_depart_prevue,
    formData.date_arrivee_prevue
  );

  // États pour les conflits
  const [chauffeurConflits, setChauffeurConflits] = useState<any[]>([]);
  const [vehiculeConflits, setVehiculeConflits] = useState<any[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // En mode édition, on affiche toutes les ressources.
  const chauffeursList = mission
    ? chauffeurs
    : (formData.date_depart_prevue && formData.date_arrivee_prevue && availableChauffeurs)
      ? availableChauffeurs
      : chauffeurs;

  const vehiculesList = mission
    ? vehicules
    : (formData.date_depart_prevue && formData.date_arrivee_prevue && availableVehicules)
      ? availableVehicules
      : vehicules;

  // Charger les disponibilités
  const { data: vehiculeAvailability } = useVehiculeAvailability(
    formData.vehicule_id || null,
    {
      startDate: formData.date_depart_prevue,
      endDate: formData.date_arrivee_prevue,
      excludeMissionId: mission?.mission_id
    }
  );

  const { data: chauffeurAvailability } = useChauffeurAvailability(
    formData.chauffeur_id || null,
    {
      startDate: formData.date_depart_prevue,
      endDate: formData.date_arrivee_prevue,
      excludeMissionId: mission?.mission_id
    }
  );

  // Mettre à jour les conflits
  useEffect(() => {
    if (vehiculeAvailability) {
      setVehiculeConflits(vehiculeAvailability.conflicts);
    } else {
      setVehiculeConflits([]); // Réinitialiser les conflits si pas de données
    }
  }, [vehiculeAvailability]);

  useEffect(() => {
    if (chauffeurAvailability) {
      setChauffeurConflits(chauffeurAvailability.conflicts);
    } else {
      setChauffeurConflits([]); // Réinitialiser les conflits si pas de données
    }
  }, [chauffeurAvailability]);

  useEffect(() => {
    if (mission) {
      setFormData({
        chauffeur_id: mission.chauffeur_id,
        vehicule_id: mission.vehicule_id,
        client_id: mission.client_id || null, // Ajout du client_id
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
        client_id: null,
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
    if (mission || isManualPrice) return; // Ne pas écraser le prix en édition ou si manuel
    if (!formData.vehicule_id || !formData.type_course || !tarifs || !vehicules || !formData.date_depart_prevue || !formData.date_arrivee_prevue) return;

    const selectedVehicule = vehicules.find(v => v.vehicule_id === formData.vehicule_id);
    if (!selectedVehicule) return;

    const tarif = tarifs.find(t =>
      t.categorie === selectedVehicule.categorie &&
      t.type_course === formData.type_course
    );

    if (tarif) {
      let finalPrice = Number(tarif.prix_base);
      
      // Si c'est une mise à disposition par journée, on calcule au prorata des jours
      if (formData.type_course === 'Mise à disposition (Journée)') {
        // Ajuster automatiquement les heures à 08:00 et 20:00 si ce n'est pas déjà le cas
        // et qu'on vient de changer le type de course
        setFormData(prev => {
          const newFormData = { ...prev };
          let updated = false;

          if (prev.date_depart_prevue && !prev.date_depart_prevue.includes('T08:00')) {
             const d = new Date(prev.date_depart_prevue);
             d.setHours(8, 0, 0, 0);
             // Format ISO local pour l'input datetime-local
             const offset = d.getTimezoneOffset() * 60000;
             newFormData.date_depart_prevue = new Date(d.getTime() - offset).toISOString().slice(0, 16);
             updated = true;
          }

          if (prev.date_arrivee_prevue && !prev.date_arrivee_prevue.includes('T20:00')) {
             const d = new Date(prev.date_arrivee_prevue);
             d.setHours(20, 0, 0, 0);
             const offset = d.getTimezoneOffset() * 60000;
             newFormData.date_arrivee_prevue = new Date(d.getTime() - offset).toISOString().slice(0, 16);
             updated = true;
          }

          return updated ? newFormData : prev;
        });

        const start = new Date(formData.date_depart_prevue);
        const end = new Date(formData.date_arrivee_prevue);
        
        // Calcul du nombre de jours (chaque jour entamé compte pour un jour de mise à disposition)
        // On normalise les dates pour ignorer l'heure précise et compter les jours calendaires
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        finalPrice = Number(tarif.prix_base) * diffDays;
        
        toast({
          title: "Calcul automatique",
          description: `Prix calculé pour ${diffDays} jour(s) de mise à disposition.`,
          duration: 3000
        });
      }

      setFormData(prev => ({
        ...prev,
        montant_total: finalPrice,
        devise: tarif.devise || prev.devise,
      }));
    }
  }, [formData.vehicule_id, formData.type_course, tarifs, vehicules, mission, isManualPrice, formData.date_depart_prevue, formData.date_arrivee_prevue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validation avec Zod
    const validation = formSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        errors[issue.path[0]] = issue.message;
      });
      setValidationErrors(errors);
      
      toast({
        title: 'Erreur de validation',
        description: Object.values(errors)[0],
        variant: 'destructive'
      });
      return;
    }

    if (!formData.chauffeur_id || !formData.vehicule_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un chauffeur et un véhicule',
        variant: 'destructive'
      });
      return;
    }

    // Validation paiement si acompte > 0 en création
    if (!mission && formData.acompte && formData.acompte > 0 && !selectedPaymentMethod) {
      toast({
        title: 'Paiement requis',
        description: 'Veuillez sélectionner une méthode de paiement pour l\'acompte.',
        variant: 'destructive'
      });
      return;
    }

    // Vérifier les conflits
    if (chauffeurConflits.length > 0 || vehiculeConflits.length > 0) {
      setShowConflictDialog(true);
      return;
    }

    executeSubmit();
  };

  const executeSubmit = async () => {
    try {
      if (mission) {
        // Mise à jour
        await updateMutation.mutateAsync({ id: mission.mission_id, ...formData });
        toast({ title: 'Mission modifiée avec succès' });
      } else {
        // Création
        await createMutation.mutateAsync({
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

  // Vérifier si le formulaire est valide pour l'envoi
  const isFormValid = formData.chauffeur_id > 0 && formData.vehicule_id > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mission ? 'Modifier la mission' : 'Nouvelle Réservation'}</DialogTitle>
          <DialogDescription>
            {mission ? 'Modifiez les paramètres de la mission en cours.' : 'Complétez les informations pour planifier une nouvelle mission de transport.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1 : Details Course */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Détails de la course
            </h3>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select
                value={formData.client_id?.toString() || ''}
                onValueChange={(value) => {
                  const selectedClient = clients?.find(c => c.client_id.toString() === value);
                  setFormData(prev => ({
                    ...prev,
                    client_id: selectedClient ? selectedClient.client_id : null,
                    client_nom: selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ''}`.trim() : '',
                    // Proposer l'adresse du client comme lieu de départ si elle existe
                    lieu_depart: (selectedClient?.adresse && !prev.lieu_depart) ? selectedClient.adresse : prev.lieu_depart
                  }));

                  if (selectedClient?.adresse) {
                    toast({
                      title: "Adresse client détectée",
                      description: `L'adresse "${selectedClient.adresse}" a été suggérée comme lieu de départ.`,
                      duration: 3000
                    });
                  }
                }}
              >                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client existant" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem
                      key={client.client_id}
                      value={client.client_id.toString()}
                    >
                      {client.titre} {client.nom} {client.prenom} ({client.telephone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="client_nom">Nom du client</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onOpenClientForm) {
                      onOpenClientForm();
                    } else {
                      setClientFormOpen(true);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nouveau
                </Button>
              </div>
              <Input
                id="client_nom"
                value={formData.client_nom || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
                placeholder="Nom du client"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Départ</Label>
                <DateTimePicker
                  value={formData.date_depart_prevue}
                  onChange={(val) => setFormData(prev => ({ ...prev, date_depart_prevue: val }))}
                  error={validationErrors.date_depart_prevue}
                />
              </div>
              <div className="space-y-2">
                <Label>Arrivée (Retour)</Label>
                <DateTimePicker
                  value={formData.date_arrivee_prevue}
                  onChange={(val) => setFormData(prev => ({ ...prev, date_arrivee_prevue: val }))}
                  error={validationErrors.date_arrivee_prevue}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lieu_depart">Lieu de départ</Label>
                  {formData.client_id && clients?.find(c => c.client_id === formData.client_id)?.adresse && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-primary"
                      onClick={() => {
                        const addr = clients?.find(c => c.client_id === formData.client_id)?.adresse;
                        if (addr) setFormData(prev => ({ ...prev, lieu_depart: addr }));
                      }}
                    >
                      Utiliser adresse client
                    </Button>
                  )}
                </div>
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
                    {vehiculesList?.map((vehicule) => {
                      const isOccupe = vehicule.etat_occupation === 'occupe';
                      return (
                        <SelectItem
                          key={vehicule.vehicule_id}
                          value={vehicule.vehicule_id.toString()}
                          className={isOccupe ? "text-orange-600" : ""}
                        >
                          {vehicule.immatriculation} {vehicule.marque} {vehicule.modele}
                          {isOccupe && (
                            <Badge variant="destructive" className="ml-2 text-xs">Occupé</Badge>
                          )}
                        </SelectItem>
                      );
                    })}
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
                    {chauffeursList?.map((chauffeur) => {
                      const isOccupe = chauffeur.disponibilite === 'Occupé'; // Supposons que le champ disponibilité indique l'état
                      return (
                        <SelectItem
                          key={chauffeur.chauffeur_id}
                          value={chauffeur.chauffeur_id.toString()}
                          className={isOccupe ? "text-orange-600" : ""}
                        >
                          {chauffeur.prenom} {chauffeur.nom}
                          {isOccupe && (
                            <Badge variant="destructive" className="ml-2 text-xs">Occupé</Badge>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Affichage des conflits potentiels */}
            {(chauffeurConflits.length > 0 || vehiculeConflits.length > 0) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Conflits de disponibilité détectés</h4>
                    {chauffeurConflits.length > 0 && (
                      <div className="mt-1 text-sm text-yellow-700">
                        <p>Chauffeur occupé pour ces missions :</p>
                        <ul className="list-disc list-inside mt-1">
                          {chauffeurConflits.map((conflit, index) => (
                            <li key={index}>Mission #{conflit.mission_id} : {conflit.lieu_depart} → {conflit.lieu_arrivee}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {vehiculeConflits.length > 0 && (
                      <div className="mt-1 text-sm text-yellow-700">
                        <p>Véhicule occupé pour ces missions :</p>
                        <ul className="list-disc list-inside mt-1">
                          {vehiculeConflits.map((conflit, index) => (
                            <li key={index}>Mission #{conflit.mission_id} : {conflit.lieu_depart} → {conflit.lieu_arrivee}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase font-bold">Prix de la course</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Saisie manuelle</span>
                  <input
                    type="checkbox"
                    checked={isManualPrice}
                    onChange={(e) => setIsManualPrice(e.target.checked)}
                    className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    value={formData.montant_total || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, montant_total: parseFloat(e.target.value) || 0 }))}
                    className={cn(
                      "text-2xl font-bold text-center h-14 bg-secondary/10 border-secondary/50",
                      !isManualPrice && "opacity-80"
                    )}
                    readOnly={!isManualPrice && !mission} // Permettre l'édition en mode mission (édition) ou si manuel
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none font-bold text-primary gap-2">
                    {formData.type_course === 'Mise à disposition (Journée)' && (
                       <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] h-6">
                         {Math.ceil(Math.abs(new Date(formData.date_arrivee_prevue).getTime() - new Date(formData.date_depart_prevue).getTime()) / (1000 * 60 * 60 * 24)) + 1} j
                       </Badge>
                    )}
                    {formData.devise}
                  </div>
                </div>

                <div className="w-24">
                  <Select
                    value={formData.devise}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, devise: value }))}
                  >
                    <SelectTrigger className="h-14 font-bold">
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {!isManualPrice && !mission && (
                <p className="text-[10px] text-center text-muted-foreground italic">
                  Le prix est calculé automatiquement selon le véhicule et le type de course. Activez "Saisie manuelle" pour le modifier.
                </p>
              )}
            </div>
          </div>

          {/* Section 3 : Paiement (Seulement en création) */}
          {!mission && (
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
              disabled={!isFormValid}
              className="min-w-[150px]"
            >
              {mission ? 'Enregistrer modifs' : (formData.acompte && formData.acompte > 0 ? 'Encaisser & Réserver' : 'Réserver (Crédit)')}
            </Button>
          </div>
          </form>

          <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-yellow-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Conflits de disponibilité
              </AlertDialogTitle>
              <AlertDialogDescription>
                Des conflits ont été détectés pour les ressources sélectionnées sur cette période. 
                Voulez-vous tout de même enregistrer cette mission ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowConflictDialog(false);
                executeSubmit();
              }}>
                Continuer quand même
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
          </DialogContent>
          </Dialog >
          );
          }