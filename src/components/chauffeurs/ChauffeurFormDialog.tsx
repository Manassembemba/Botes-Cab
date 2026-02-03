import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateChauffeur, useUpdateChauffeur, type Chauffeur, type ChauffeurInsert } from '@/hooks/useChauffeurs';
import { useToast } from '@/hooks/use-toast';

interface ChauffeurFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chauffeur?: Chauffeur | null;
}

const disponibiliteOptions = [
  { value: 'Disponible', label: 'Disponible' },
  { value: 'En mission', label: 'En mission' },
  { value: 'Indisponible', label: 'En mission' },
  { value: 'Repos', label: 'Repos' },
  { value: 'Congé maladie', label: 'Congé maladie' },
];

export function ChauffeurFormDialog({ open, onOpenChange, chauffeur }: ChauffeurFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateChauffeur();
  const updateMutation = useUpdateChauffeur();
  const isEditing = !!chauffeur;

  const [formData, setFormData] = useState<ChauffeurInsert>({
    nom: '',
    prenom: '',
    tel: '',
    permis_exp_date: '',
    disponibilite: 'Disponible',
    date_embauche: '',
    email: '',
    type_contrat: 'CDI',
  });

  useEffect(() => {
    if (chauffeur) {
      setFormData({
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        tel: chauffeur.tel || '',
        permis_exp_date: chauffeur.permis_exp_date,
        disponibilite: chauffeur.disponibilite,
        date_embauche: chauffeur.date_embauche,
        email: chauffeur.email || '',
        type_contrat: chauffeur.type_contrat || 'CDI',
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        tel: '',
        permis_exp_date: '',
        disponibilite: 'Disponible',
        date_embauche: '',
        email: '',
        type_contrat: 'CDI',
      });
    }
  }, [chauffeur, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && chauffeur) {
        await updateMutation.mutateAsync({ id: chauffeur.chauffeur_id, ...formData });
        toast({ title: 'Chauffeur modifié avec succès' });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: 'Chauffeur ajouté avec succès' });
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

  const handleChange = (field: keyof ChauffeurInsert, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => handleChange('prenom', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tel">Téléphone</Label>
            <Input
              id="tel"
              type="tel"
              value={formData.tel || ''}
              onChange={(e) => handleChange('tel', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permis_exp_date">Expiration du permis</Label>
              <Input
                id="permis_exp_date"
                type="date"
                value={formData.permis_exp_date}
                onChange={(e) => handleChange('permis_exp_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_embauche">Date d'embauche</Label>
              <Input
                id="date_embauche"
                type="date"
                value={formData.date_embauche}
                onChange={(e) => handleChange('date_embauche', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disponibilite">Disponibilité</Label>
              <Select
                value={formData.disponibilite}
                onValueChange={(value) => handleChange('disponibilite', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {disponibiliteOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_contrat">Type de Contrat</Label>
              <Select
                value={formData.type_contrat || 'CDI'}
                onValueChange={(value) => handleChange('type_contrat', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="Prestataire">Prestataire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="chauffeur@botes-cab.com"
            />
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
      </DialogContent>
    </Dialog>
  );
}
