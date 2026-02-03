import { useState } from 'react';
import { useTarifs, useUpdateTarif, type Tarif } from '@/hooks/useTarifs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Tags } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TarifSettings() {
    const { data: tarifs, isLoading } = useTarifs();
    const updateMutation = useUpdateTarif();
    const { toast } = useToast();
    const [editingPrices, setEditingPrices] = useState<Record<number, number>>({});

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handlePriceChange = (id: number, price: string) => {
        setEditingPrices(prev => ({
            ...prev,
            [id]: parseFloat(price) || 0
        }));
    };

    const handleSave = async (id: number) => {
        const newPrice = editingPrices[id];
        if (newPrice === undefined) return;

        try {
            await updateMutation.mutateAsync({ id, prix_base: newPrice });
            toast({ title: 'Tarif mis à jour' });
            const newEditing = { ...editingPrices };
            delete newEditing[id];
            setEditingPrices(newEditing);
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Impossible de mettre à jour le tarif',
                variant: 'destructive'
            });
        }
    };

    // Grouper les tarifs par catégorie pour un affichage plus propre
    const groupedTarifs = tarifs?.reduce((acc, tarif) => {
        if (!acc[tarif.categorie]) acc[tarif.categorie] = [];
        acc[tarif.categorie].push(tarif);
        return acc;
    }, {} as Record<string, Tarif[]>) || {};

    return (
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-6">
                <div className="rounded-lg bg-primary/10 p-2">
                    <Tags className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-semibold text-foreground">Grille de Tarification</h2>
                    <p className="text-sm text-muted-foreground">Définissez les prix de base par catégorie de véhicule et type de course</p>
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedTarifs).map(([categorie, items]) => (
                    <div key={categorie} className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {categorie}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {items.map((tarif) => (
                                <div key={tarif.tarif_id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                                    <Label className="text-xs text-muted-foreground">{tarif.type_course}</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="number"
                                                defaultValue={tarif.prix_base}
                                                onChange={(e) => handlePriceChange(tarif.tarif_id, e.target.value)}
                                                className="h-8 pr-12 text-sm font-medium"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                                                {tarif.devise}
                                            </span>
                                        </div>
                                        {editingPrices[tarif.tarif_id] !== undefined && (
                                            <Button
                                                size="icon"
                                                variant="default"
                                                className="h-8 w-8"
                                                onClick={() => handleSave(tarif.tarif_id)}
                                                disabled={updateMutation.isPending}
                                            >
                                                <Save className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
