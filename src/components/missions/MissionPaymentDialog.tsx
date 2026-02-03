import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useAddMissionPayment } from '@/hooks/useAddMissionPayment';
import { Loader2, DollarSign } from 'lucide-react';
import { MissionWithDetails } from '@/hooks/useMissions';
import { format } from 'date-fns';

const formSchema = z.object({
    amount: z.coerce.number().min(0.01, "Le montant doit être positif"),
    methodId: z.coerce.number().min(1, "Méthode de paiement requise"),
});

interface MissionPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mission: MissionWithDetails | null;
}

export function MissionPaymentDialog({ open, onOpenChange, mission }: MissionPaymentDialogProps) {
    const { toast } = useToast();
    const { data: paymentMethods } = usePaymentMethods();
    const addPayment = useAddMissionPayment();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            methodId: undefined,
        },
    });

    // Met à jour le formulaire quand la mission change
    useEffect(() => {
        if (mission && open) {
            form.reset({
                amount: mission.solde && mission.solde > 0 ? mission.solde : 0,
                methodId: undefined,
            });
        }
    }, [mission, open, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!mission) return;

        try {
            const dateCourse = mission.date_depart_prevue ? format(new Date(mission.date_depart_prevue), 'dd/MM/yyyy') : 'N/A';
            const customNote = `Solde montant restant pour la course du ${dateCourse}`;

            await addPayment.mutateAsync({
                missionId: mission.mission_id,
                amount: values.amount,
                methodId: values.methodId,
                notes: customNote
            });

            toast({
                title: "Paiement enregistré",
                description: `Le solde de ${values.amount} ${mission.devise} a été réglé.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'enregistrer le paiement.",
            });
        }
    };

    if (!mission) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Régler le solde de la mission</DialogTitle>
                    <DialogDescription>
                        Enregistrez un paiement pour la mission de {mission.lieu_depart} vers {mission.lieu_arrivee}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-muted p-3 rounded-lg flex justify-between items-center mb-4">
                        <span className="text-sm font-medium">Solde Restant :</span>
                        <span className="text-lg font-bold text-destructive">
                            {mission.solde?.toLocaleString()} {mission.devise}
                        </span>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Montant du Paiement</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" step="0.01" className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="methodId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Méthode de Paiement</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choisir..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentMethods?.map((method) => (
                                                    <SelectItem key={method.method_id} value={method.method_id.toString()}>
                                                        {method.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={addPayment.isPending}>
                                    {addPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Valider Paiement
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
