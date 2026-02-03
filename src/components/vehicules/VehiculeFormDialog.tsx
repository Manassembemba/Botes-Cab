import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVehicule, useUpdateVehicule, type Vehicule, type VehiculeInsert } from '@/hooks/useVehicules';
import { useToast } from '@/hooks/use-toast';

interface VehiculeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicule?: Vehicule | null;
}

const statutOptions = [
  { value: 'Libre', label: 'Libre' },
  { value: 'Affecté', label: 'Affecté' },
  { value: 'Maintenance', label: 'En maintenance' },
  { value: 'Hors service', label: 'Hors service' },
];

export function VehiculeFormDialog({ open, onOpenChange, vehicule }: VehiculeFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateVehicule();
  const updateMutation = useUpdateVehicule();
  const isEditing = !!vehicule;

  const [formData, setFormData] = useState<VehiculeInsert>({
    immatriculation: '',
    marque: '',
    modele: '',
    annee_achat: null,
    kilometrage_actuel: 0,
    statut: 'Libre',
    date_prochaine_revision: null,
    numero_chassis: '',
    date_achat: null,
    valeur_achat: 0,
    type_carburant: 'Diesel',
    capacite_reservoir: 0,
  });

  useEffect(() => {
    if (vehicule) {
      setFormData({
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        annee_achat: vehicule.annee_achat,
        kilometrage_actuel: vehicule.kilometrage_actuel,
        statut: vehicule.statut,
        date_prochaine_revision: vehicule.date_prochaine_revision,
        numero_chassis: vehicule.numero_chassis || '',
        date_achat: vehicule.date_achat,
        valeur_achat: vehicule.valeur_achat || 0,
        type_carburant: vehicule.type_carburant || 'Diesel',
        capacite_reservoir: vehicule.capacite_reservoir || 0,
      });
    } else {
      setFormData({
        immatriculation: '',
        marque: '',
        modele: '',
        annee_achat: null,
        kilometrage_actuel: 0,
        statut: 'Libre',
        date_prochaine_revision: null,
        numero_chassis: '',
        date_achat: null,
        valeur_achat: 0,
        type_carburant: 'Diesel',
        capacite_reservoir: 0,
      });
    }
  }, [vehicule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && vehicule) {
        await updateMutation.mutateAsync({ id: vehicule.vehicule_id, ...formData });
        toast({ title: 'Véhicule modifié avec succès' });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: 'Véhicule ajouté avec succès' });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="immatriculation">Immatriculation</Label>
            <Input
              id="immatriculation"
              value={formData.immatriculation}
              onChange={(e) => setFormData(prev => ({ ...prev, immatriculation: e.target.value }))}
              placeholder="AA-123-BB"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input
                id="modele"
                value={formData.modele}
                onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annee_achat">Année d'achat</Label>
              <Input
                id="annee_achat"
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.annee_achat || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, annee_achat: e.target.value ? parseInt(e.target.value) : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kilometrage_actuel">Kilométrage</Label>
              <Input
                id="kilometrage_actuel"
                type="number"
                min="0"
                value={formData.kilometrage_actuel}
                onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_actuel: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
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
            <div className="space-y-2">
              <Label htmlFor="date_prochaine_revision">Prochaine révision</Label>
              <Input
                id="date_prochaine_revision"
                type="date"
                value={formData.date_prochaine_revision || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, date_prochaine_revision: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Informations Techniques</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numero_chassis">Numéro de Châssis</Label>
                <Input
                  id="numero_chassis"
                  value={formData.numero_chassis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_chassis: e.target.value }))}
                  placeholder="VIN / N° de série"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_achat">Date d'achat</Label>
                  <Input
                    id="date_achat"
                    type="date"
                    value={formData.date_achat || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_achat: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valeur_achat">Valeur d'achat ($)</Label>
                  <Input
                    id="valeur_achat"
                    type="number"
                    value={formData.valeur_achat || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, valeur_achat: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_carburant">Carburant</Label>
                  <Select
                    value={formData.type_carburant || 'Diesel'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type_carburant: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Essence">Essence</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Hybride">Hybride</SelectItem>
                      <SelectItem value="Électrique">Électrique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacite_reservoir">Capacité Réservoir (L)</Label>
                  <Input
                    id="capacite_reservoir"
                    type="number"
                    value={formData.capacite_reservoir || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacite_reservoir: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent >
    </Dialog >
  );
}
