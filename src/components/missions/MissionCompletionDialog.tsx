import React from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useCompleteMission, type MissionWithDetails } from '@/hooks/useMissions';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    montant: z.coerce.number().min(0, 'Le montant doit être positif'),
    devise: z.string().min(1, 'La devise est requise'),
    raison: z.string().optional(),
    isChargeEntreprise: z.boolean().default(true),
});

interface MissionCompletionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mission: MissionWithDetails | null;
}

export function MissionCompletionDialog({
    open,
    onOpenChange,
    mission,
}: MissionCompletionDialogProps) {
    const { toast } = useToast();
    const completeMutation = useCompleteMission();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            montant: 0,
            devise: 'USD',
            raison: '',
            isChargeEntreprise: true,
        },
    });

    // Reset form when mission changes
    React.useEffect(() => {
        if (mission) {
            // Déterminer la charge par défaut selon le type de course
            const type = mission.type_course || '';
            const isDaily = type.includes('Journée') || type.toLowerCase().includes('journalière');

            // Règle: Journalière -> Client (Charge Entreprise = OFF)
            // Règle: Aéroport -> Entreprise (Charge Entreprise = ON)
            // Par défaut (Urbain/Autre) -> Entreprise
            const defaultChargeEntreprise = !isDaily;

            form.reset({
                montant: 0,
                devise: 'USD',
                raison: '',
                isChargeEntreprise: defaultChargeEntreprise,
            });
        }
    }, [mission, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!mission) return;

        try {
            await completeMutation.mutateAsync({
                missionId: mission.mission_id,
                montant: values.montant,
                devise: values.devise,
                raison: values.raison,
                isChargeEntreprise: values.isChargeEntreprise,
            });

            toast({
                title: 'Mission terminée',
                description: values.isChargeEntreprise && values.montant > 0
                    ? 'La mission a été clôturée et la dépense enregistrée.'
                    : 'La mission a été clôturée avec succès.',
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Impossible de clôturer la mission.',
                variant: 'destructive',
            });
        }
    };

    const isChargeEntrepriseValue = form.watch('isChargeEntreprise');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Clôturer la Mission
                    </DialogTitle>
                    <DialogDescription>
                        Entrez les frais engagés pour cette course.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border/50">
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Fuel className="h-4 w-4 text-primary" />
                                    Prise en Charge
                                </h4>
                                <p className="text-[10px] text-muted-foreground italic">
                                    Type: {mission?.type_course}
                                </p>
                            </div>
                            <FormField
                                control={form.control}
                                name="isChargeEntreprise"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormLabel className="text-xs font-medium cursor-pointer">
                                            Botes CAB
                                        </FormLabel>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {!isChargeEntrepriseValue && (
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                                <Info className="h-4 w-4 shrink-0" />
                                <p>Carburant à charge client : aucun impact sur la caisse.</p>
                            </div>
                        )}

                        <div className={cn("space-y-4 transition-opacity", !isChargeEntrepriseValue && "opacity-60")}>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="montant"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Montant Dépense</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="devise"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Devise</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Devise" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="CDF">CDF</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="raison"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Raison / Notes</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Ex: Carburant, Péage, Lavage..."
                                                className="resize-none h-24"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={completeMutation.isPending}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={completeMutation.isPending} className="min-w-[120px]">
                                {completeMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Terminer
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
