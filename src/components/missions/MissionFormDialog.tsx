import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMission, useUpdateMission, type Mission, type MissionInsert } from '@/hooks/useMissions';
import { useChauffeurs } from '@/hooks/useChauffeurs';
import { useVehicules } from '@/hooks/useVehicules';
import { useToast } from '@/hooks/use-toast';

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

export function MissionFormDialog({ open, onOpenChange, mission }: MissionFormDialogProps) {
  const { toast } = useToast();
  const { data: chauffeurs } = useChauffeurs();
  const { data: vehicules } = useVehicules();
  const createMutation = useCreateMission();
  const updateMutation = useUpdateMission();
  const isEditing = !!mission;

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
  });

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
      });
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
        acompte: 0,
        solde: 0,
        devise: 'USD',
        kilometrage_fin: null,
      });
    }
  }, [mission, open]);

  // Calcul automatique du solde
  useEffect(() => {
    const total = Number(formData.montant_total) || 0;
    const acompt = Number(formData.acompte) || 0;
    setFormData(prev => ({ ...prev, solde: total - acompt }));
  }, [formData.montant_total, formData.acompte]);

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

    try {
      if (isEditing && mission) {
        await updateMutation.mutateAsync({ id: mission.mission_id, ...formData });
        toast({ title: 'Mission modifiée avec succès' });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: 'Mission créée avec succès' });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la mission' : 'Nouvelle mission'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_nom">Client</Label>
            <Input
              id="client_nom"
              value={formData.client_nom || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
              placeholder="Nom du client (optionnel)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  {chauffeurs?.map((chauffeur) => (
                    <SelectItem key={chauffeur.chauffeur_id} value={chauffeur.chauffeur_id.toString()}>
                      {chauffeur.prenom} {chauffeur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  {vehicules?.map((vehicule) => (
                    <SelectItem key={vehicule.vehicule_id} value={vehicule.vehicule_id.toString()}>
                      {vehicule.marque} {vehicule.modele} - {vehicule.immatriculation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_depart_prevue">Date/Heure de départ</Label>
              <Input
                id="date_depart_prevue"
                type="datetime-local"
                value={formData.date_depart_prevue}
                onChange={(e) => setFormData(prev => ({ ...prev, date_depart_prevue: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_arrivee_prevue">Date/Heure d'arrivée</Label>
              <Input
                id="date_arrivee_prevue"
                type="datetime-local"
                value={formData.date_arrivee_prevue}
                onChange={(e) => setFormData(prev => ({ ...prev, date_arrivee_prevue: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statut_mission">Statut</Label>
            <Select
              value={formData.statut_mission}
              onValueChange={(value) => setFormData(prev => ({ ...prev, statut_mission: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                {statutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kilometrage_fin">Kilométrage de fin</Label>
              <Input
                id="kilometrage_fin"
                type="number"
                value={formData.kilometrage_fin || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_fin: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Km à la fin (optionnel)"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm">Informations Financières</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant_total">Montant Total</Label>
                <div className="relative">
                  <Input
                    id="montant_total"
                    type="number"
                    value={formData.montant_total || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, montant_total: parseFloat(e.target.value) }))}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm font-medium">
                    {formData.devise}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acompte">Acompte Versé</Label>
                <div className="relative">
                  <Input
                    id="acompte"
                    type="number"
                    value={formData.acompte || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, acompte: parseFloat(e.target.value) }))}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm font-medium">
                    {formData.devise}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="solde">Solde à Payer</Label>
                <div className="relative">
                  <Input
                    id="solde"
                    type="number"
                    value={formData.solde || 0}
                    disabled
                    className="pr-16 bg-muted/30 font-semibold"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm font-medium">
                    {formData.devise}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="devise">Devise</Label>
                <Select
                  value={formData.devise || 'USD'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, devise: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CDF">CDF (FC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent >
    </Dialog >
  );
}
