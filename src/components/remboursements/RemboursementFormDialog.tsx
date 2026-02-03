import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Remboursement, RemboursementFormData } from '@/hooks/useRemboursements';
import { useMissions } from '@/hooks/useMissions';

interface RemboursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remboursement?: Remboursement | null;
  onSubmit: (data: RemboursementFormData) => void;
  isLoading?: boolean;
}

const STATUTS = ['En attente', 'En cours d\'examen', 'Approuvé', 'Refusé', 'Remboursé'];

export function RemboursementFormDialog({
  open,
  onOpenChange,
  remboursement,
  onSubmit,
  isLoading,
}: RemboursementFormDialogProps) {
  const { data: missions = [] } = useMissions();
  const [formData, setFormData] = useState<RemboursementFormData>({
    client_nom: '',
    montant: 0,
    motif: '',
    statut: 'En attente',
    date_demande: new Date().toISOString(),
    mission_id: null,
    notes: '',
  });

  useEffect(() => {
    if (remboursement) {
      setFormData({
        client_nom: remboursement.client_nom,
        montant: remboursement.montant,
        motif: remboursement.motif,
        statut: remboursement.statut,
        date_demande: remboursement.date_demande,
        date_traitement: remboursement.date_traitement,
        mission_id: remboursement.mission_id,
        notes: remboursement.notes || '',
      });
    } else {
      setFormData({
        client_nom: '',
        montant: 0,
        motif: '',
        statut: 'En attente',
        date_demande: new Date().toISOString(),
        mission_id: null,
        notes: '',
      });
    }
  }, [remboursement, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If status changes to Approuvé or Refusé, set date_traitement
    const dataToSubmit = { ...formData };
    if ((formData.statut === 'Approuvé' || formData.statut === 'Refusé' || formData.statut === 'Remboursé') && !formData.date_traitement) {
      dataToSubmit.date_traitement = new Date().toISOString();
    }
    
    onSubmit(dataToSubmit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {remboursement ? 'Modifier le remboursement' : 'Nouvelle demande de remboursement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_nom">Nom du client *</Label>
            <Input
              id="client_nom"
              value={formData.client_nom}
              onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant ($) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              min="0"
              value={formData.montant}
              onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motif">Motif *</Label>
            <Textarea
              id="motif"
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              placeholder="Raison de la demande de remboursement..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission_id">Mission associée (optionnel)</Label>
            <Select
              value={formData.mission_id?.toString() || 'none'}
              onValueChange={(value) => setFormData({ ...formData, mission_id: value === 'none' ? null : parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une mission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune mission</SelectItem>
                {missions.map((mission) => (
                  <SelectItem key={mission.mission_id} value={mission.mission_id.toString()}>
                    {mission.lieu_depart} → {mission.lieu_arrivee} ({mission.client_nom || 'Sans client'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select
              value={formData.statut}
              onValueChange={(value) => setFormData({ ...formData, statut: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS.map((statut) => (
                  <SelectItem key={statut} value={statut}>
                    {statut}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : remboursement ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
