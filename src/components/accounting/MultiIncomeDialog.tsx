import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, Loader2, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { useValidateMultiIncome } from '@/hooks/useCaisse';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface IncomeItem {
    id: string;
    qte: number;
    description: string;
    pu_usd: number;
    pu_cdf: number;
}

interface MultiIncomeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MultiIncomeDialog({ open, onOpenChange }: MultiIncomeDialogProps) {
    const { toast } = useToast();
    const validateMutation = useValidateMultiIncome();

    const [date, setDate] = useState<Date>(new Date());
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<IncomeItem[]>([
        { id: crypto.randomUUID(), qte: 1, description: '', pu_usd: 0, pu_cdf: 0 }
    ]);

    const addItem = () => {
        setItems([...items, { id: crypto.randomUUID(), qte: 1, description: '', pu_usd: 0, pu_cdf: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof IncomeItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const totals = items.reduce((acc, item) => ({
        usd: acc.usd + (item.qte * item.pu_usd),
        cdf: acc.cdf + (item.qte * item.pu_cdf)
    }), { usd: 0, cdf: 0 });

    const handleSubmit = async () => {
        if (items.some(item => !item.description)) {
            toast({
                title: "Attention",
                description: "Veuillez remplir toutes les descriptions.",
                variant: "destructive"
            });
            return;
        }

        try {
            await validateMutation.mutateAsync({
                dateEntree: date,
                description: description || "Enregistrement de revenus groupés",
                items: items.map(({ qte, description, pu_usd, pu_cdf }) => ({
                    qte, description, pu_usd, pu_cdf
                }))
            });

            toast({
                title: "Succès",
                description: "Les revenus ont été enregistrés avec succès."
            });
            onOpenChange(false);
            setItems([{ id: crypto.randomUUID(), qte: 1, description: '', pu_usd: 0, pu_cdf: 0 }]);
            setDescription('');
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible d'enregistrer les revenus.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Nouvelle Entrée de Fonds Multi-lignes
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div className="space-y-2">
                        <Label>Date de l'entrée</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Libellé Global (Optionnel)</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Recettes de la semaine, Apport capital..."
                        />
                    </div>
                </div>

                <div className="border border-status-available/20 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-status-available/5 border-b border-status-available/10 font-medium">
                            <tr>
                                <th className="px-3 py-2 text-left w-16 text-status-available">Qte</th>
                                <th className="px-3 py-2 text-left text-status-available">Description</th>
                                <th className="px-3 py-2 text-right w-28 text-status-available">PU USD</th>
                                <th className="px-3 py-2 text-right w-28 text-status-available">PU CDF</th>
                                <th className="px-3 py-2 text-right w-28 text-status-available">Total USD</th>
                                <th className="px-3 py-2 text-right w-28 text-status-available">Total CDF</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-status-available/5">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-status-available/5 transition-colors">
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.qte}
                                            onChange={(e) => updateItem(item.id, 'qte', parseFloat(e.target.value) || 0)}
                                            className="h-8 px-2 border-status-available/20 focus-visible:ring-status-available"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Libellé du revenu"
                                            className="h-8 border-status-available/20 focus-visible:ring-status-available"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.pu_usd}
                                            onChange={(e) => updateItem(item.id, 'pu_usd', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-right border-status-available/20 focus-visible:ring-status-available"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.pu_cdf}
                                            onChange={(e) => updateItem(item.id, 'pu_cdf', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-right border-status-available/20 focus-visible:ring-status-available"
                                        />
                                    </td>
                                    <td className="p-2 text-right font-medium text-status-available">
                                        {(item.qte * item.pu_usd).toLocaleString()} $
                                    </td>
                                    <td className="p-2 text-right font-medium text-muted-foreground">
                                        {(item.qte * item.pu_cdf).toLocaleString()} FC
                                    </td>
                                    <td className="p-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length <= 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-status-available/10 font-bold border-t border-status-available/20">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right text-base uppercase text-status-available">Total des Entrées</td>
                                <td className="px-3 py-2 text-right text-base text-status-available whitespace-nowrap">
                                    {totals.usd.toLocaleString()} USD
                                </td>
                                <td className="px-3 py-2 text-right text-base text-status-available whitespace-nowrap">
                                    {totals.cdf.toLocaleString()} CDF
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-start mt-2">
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-2 border-status-available/20 hover:bg-status-available/5 text-status-available">
                        <Plus className="h-4 w-4" />
                        Ajouter une ligne
                    </Button>
                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={validateMutation.isPending}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={validateMutation.isPending}
                        className="gap-2 min-w-[150px] bg-status-available hover:bg-status-available/90"
                    >
                        {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                        Valider l'Entrée
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
