import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMaintenance, useUpdateMaintenance, type Maintenance } from '@/hooks/useMaintenance';
import { useVehicules } from '@/hooks/useVehicules';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance | null;
}

const formSchema = z.object({
  vehicule_id: z.number(),
  type_intervention: z.string().min(1, 'Le type d\'intervention est requis'),
  description: z.string().min(1, 'La description est requise'),
  cout_estime: z.number().nonnegative('Le coût estimé doit être positif'),
  date_prevue: z.string().min(1, 'La date prévue est requise'),
  priorite: z.enum(['basse', 'moyenne', 'haute']),
  statut: z.enum(['planifiee', 'en_cours', 'terminee']),
});

export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: MaintenanceFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const { data: vehicules } = useVehicules();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicule_id: 0,
      type_intervention: '',
      description: '',
      cout_estime: 0,
      date_prevue: '',
      priorite: 'moyenne',
      statut: 'planifiee',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (maintenance) {
      form.reset({
        vehicule_id: maintenance.vehicule_id,
        type_intervention: maintenance.type_intervention,
        description: maintenance.description,
        cout_estime: maintenance.cout_estime || 0,
        date_prevue: maintenance.date_prevue?.slice(0, 16) || '',
        priorite: maintenance.priorite as 'basse' | 'moyenne' | 'haute',
        statut: maintenance.statut as 'planifiee' | 'en_cours' | 'terminee',
      });
    } else {
      form.reset({
        vehicule_id: 0,
        type_intervention: '',
        description: '',
        cout_estime: 0,
        date_prevue: '',
        priorite: 'moyenne',
        statut: 'planifiee',
      });
    }
  }, [maintenance, form, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      if (maintenance) {
        // Mise à jour
        await updateMutation.mutateAsync({
          id: maintenance.maintenance_id,
          ...values
        });
        toast({ title: 'Maintenance mise à jour avec succès' });
      } else {
        // Création
        await createMutation.mutateAsync(values);
        toast({ title: 'Maintenance créée avec succès' });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la maintenance',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? 'Modifier la Maintenance' : 'Nouvel Ordre de Travail'}
          </DialogTitle>
          <DialogDescription>
            {maintenance ? 'Modifiez les détails de l\'intervention de maintenance actuelle.' : 'Enregistrez une nouvelle intervention ou une révision prévue pour un véhicule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicule_id">Véhicule</Label>
              <Select
                value={form.watch('vehicule_id').toString()}
                onValueChange={(value) => form.setValue('vehicule_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules?.map((vehicule) => (
                    <SelectItem key={vehicule.vehicule_id} value={vehicule.vehicule_id.toString()}>
                      {vehicule.immatriculation} - {vehicule.marque} {vehicule.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.vehicule_id && (
                <p className="text-sm text-destructive">{form.formState.errors.vehicule_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type_intervention">Type d'intervention</Label>
              <Input
                id="type_intervention"
                {...form.register('type_intervention', { required: true })}
              />
              {form.formState.errors.type_intervention && (
                <p className="text-sm text-destructive">{form.formState.errors.type_intervention.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description', { required: true })}
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cout_estime">Coût estimé</Label>
                <Input
                  id="cout_estime"
                  type="number"
                  step="0.01"
                  {...form.register('cout_estime', { valueAsNumber: true, required: true })}
                />
                {form.formState.errors.cout_estime && (
                  <p className="text-sm text-destructive">{form.formState.errors.cout_estime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_prevue">Date prévue</Label>
                <Input
                  id="date_prevue"
                  type="datetime-local"
                  {...form.register('date_prevue', { required: true })}
                />
                {form.formState.errors.date_prevue && (
                  <p className="text-sm text-destructive">{form.formState.errors.date_prevue.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priorite">Priorité</Label>
                <Select
                  value={form.watch('priorite')}
                  onValueChange={(value) => form.setValue('priorite', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  value={form.watch('statut')}
                  onValueChange={(value) => form.setValue('statut', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || isSubmitting}>
              {(isLoading || isSubmitting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : maintenance ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}