import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useValidateMultiExpense } from '@/hooks/useDepenses';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ExpenseItem {
    id: string;
    qte: number;
    description: string;
    pu_usd: number;
    pu_cdf: number;
}

interface MultiExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MultiExpenseDialog({ open, onOpenChange }: MultiExpenseDialogProps) {
    const { toast } = useToast();
    const validateMutation = useValidateMultiExpense();

    const [date, setDate] = useState<Date>(new Date());
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<ExpenseItem[]>([
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

    const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
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
                dateBon: date,
                description: description || "Bon de dépense groupé",
                items: items.map(({ qte, description, pu_usd, pu_cdf }) => ({
                    qte, description, pu_usd, pu_cdf
                }))
            });

            toast({
                title: "Succès",
                description: "Le bon de dépense a été enregistré et validé."
            });
            onOpenChange(false);
            // Reset form
            setItems([{ id: crypto.randomUUID(), qte: 1, description: '', pu_usd: 0, pu_cdf: 0 }]);
            setDescription('');
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible d'enregistrer le bon de dépense.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Nouveau Bon de Dépense Multi-lignes
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div className="space-y-2">
                        <Label>Date du bon</Label>
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
                        <Label>Description Globale (Optionnelle)</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Achats bureau mensuel..."
                        />
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b font-medium">
                            <tr>
                                <th className="px-3 py-2 text-left w-16">Qte</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-right w-28">PU USD</th>
                                <th className="px-3 py-2 text-right w-28">PU CDF</th>
                                <th className="px-3 py-2 text-right w-28">Total USD</th>
                                <th className="px-3 py-2 text-right w-28">Total CDF</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/5 transition-colors">
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.qte}
                                            onChange={(e) => updateItem(item.id, 'qte', parseFloat(e.target.value) || 0)}
                                            className="h-8 px-2"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Libellé de l'article"
                                            className="h-8"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.pu_usd}
                                            onChange={(e) => updateItem(item.id, 'pu_usd', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            value={item.pu_cdf}
                                            onChange={(e) => updateItem(item.id, 'pu_cdf', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="p-2 text-right font-medium">
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
                        <tfoot className="bg-muted/30 font-bold border-t">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right text-base uppercase">Total Général</td>
                                <td className="px-3 py-2 text-right text-base text-primary whitespace-nowrap">
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
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter une ligne
                    </Button>
                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={validateMutation.isPending}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={validateMutation.isPending} className="gap-2 min-w-[150px]">
                        {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Valider le Bon
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
