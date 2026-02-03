import { useState, useMemo } from 'react';
import { useCaisse, useSoldeCaisse } from '@/hooks/useCaisse';
import { useDepenses, useCreateDepense } from '@/hooks/useDepenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, ArrowUpRight, ArrowDownLeft, Wallet, Receipt, History, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type DateFilterType = 'today' | 'week' | 'month' | 'custom';

export default function Accounting() {
    const { data: transactions, isLoading } = useCaisse();
    const { soldeUSD, soldeCDF } = useSoldeCaisse();
    const { data: depenses } = useDepenses();

    // États pour le filtrage
    const [filterType, setFilterType] = useState<DateFilterType>('today');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Calcul des transactions filtrées
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];

        const now = new Date();
        let start: Date;
        let end: Date;

        switch (filterType) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = startOfWeek(now, { locale: fr });
                end = endOfWeek(now, { locale: fr });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'custom':
                if (dateRange?.from) {
                    start = startOfDay(dateRange.from);
                    end = endOfDay(dateRange.to || dateRange.from);
                } else {
                    return transactions; // Pas de range défini, on montre tout ou rien ? Tout pour l'instant.
                }
                break;
            default:
                start = startOfDay(now);
                end = endOfDay(now);
        }

        return transactions.filter(t => {
            if (!t.date_transaction) return false;
            const txDate = new Date(t.date_transaction);
            return isWithinInterval(txDate, { start, end });
        });
    }, [transactions, filterType, dateRange]);

    // Calcul des flux sur la période filtrée
    const fluxPeriode = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const montant = Number(t.montant);
            // Normalisation devise : USD ou CDF/FC
            const isCDF = t.devise === 'CDF' || t.devise === 'FC';

            if (!isCDF) { // USD
                if (t.type === 'Entrée') acc.entreesUSD += montant;
                else acc.sortiesUSD += montant;
            } else { // CDF
                if (t.type === 'Entrée') acc.entreesCDF += montant;
                else acc.sortiesCDF += montant;
            }
            return acc;
        }, { entreesUSD: 0, sortiesUSD: 0, entreesCDF: 0, sortiesCDF: 0 });
    }, [filteredTransactions]);

    const soldePeriodeUSD = fluxPeriode.entreesUSD - fluxPeriode.sortiesUSD;
    const soldePeriodeCDF = fluxPeriode.entreesCDF - fluxPeriode.sortiesCDF;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Comptabilité & Caisse</h1>
                    <p className="text-muted-foreground mt-1">Suivi des flux financiers et solde de caisse</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Nouvelle Dépense
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nouvelle Entrée
                    </Button>
                </div>
            </div>

            {/* Filtres de Date */}
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-card p-2 rounded-lg border border-border overflow-x-auto">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground px-2 flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Période :
                    </span>
                    <Button
                        variant={filterType === 'today' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterType('today')}
                        className="text-sm"
                    >
                        Aujourd'hui
                    </Button>
                    <Button
                        variant={filterType === 'week' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterType('week')}
                        className="text-sm"
                    >
                        Cette Semaine
                    </Button>
                    <Button
                        variant={filterType === 'month' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterType('month')}
                        className="text-sm"
                    >
                        Ce Mois
                    </Button>
                </div>

                <div className="h-4 w-px bg-border mx-2 hidden sm:block" />

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={filterType === 'custom' ? 'secondary' : 'outline'}
                            size="sm"
                            className={cn(
                                "justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            onClick={() => setFilterType('custom')}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                                        {format(dateRange.to, "dd/MM/yyyy")}
                                    </>
                                ) : (
                                    format(dateRange.from, "dd/MM/yyyy")
                                )
                            ) : (
                                <span>Date personnalisée</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                                setDateRange(range);
                                setFilterType('custom');
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Soldes Section */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solde (Période)</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {soldePeriodeUSD >= 0 ? '+' : ''}{soldePeriodeUSD.toLocaleString()} USD
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Résultat net sur la période</p>
                    </CardContent>
                </Card>

                <Card className="bg-status-available/5 border-status-available/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solde CDF (Période)</CardTitle>
                        <Wallet className="h-4 w-4 text-status-available" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-status-available">
                            {soldePeriodeCDF >= 0 ? '+' : ''}{soldePeriodeCDF.toLocaleString()} FC
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Résultat net sur la période</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Flux (Période sélectionnée)</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Entrées (USD)</p>
                                <div className="text-lg font-semibold text-status-available">
                                    +${fluxPeriode.entreesUSD.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sorties (USD)</p>
                                <div className="text-lg font-semibold text-destructive">
                                    -${fluxPeriode.sortiesUSD.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Transactions ({filteredTransactions.length})</h3>
                    {/* Le bouton voir tout pourrait réinitialiser le filtre, mais on l'enlève pour ne pas confondre */}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Source</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTransactions?.map((t) => (
                                <tr key={t.transaction_id} className="hover:bg-accent/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.type === 'Entrée' ? 'bg-status-available/10 text-status-available' : 'bg-destructive/10 text-destructive'
                                            }`}>
                                            {t.type === 'Entrée' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                            {t.type}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {t.date_transaction ? format(new Date(t.date_transaction), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                                        {t.description}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold w-fit">
                                                {t.source_type || 'Manuel'}
                                            </Badge>
                                            {/* Affichage du solde restant si lié à une mission */}
                                            {'mission_solde' in t && t.mission_solde !== undefined && (t.mission_solde > 0) && (
                                                <div className="flex items-center gap-1 text-[10px] text-destructive font-medium bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10 w-fit">
                                                    <span>Reste:</span>
                                                    <span>{t.mission_solde.toLocaleString()} {t.devise}</span>
                                                </div>
                                            )}
                                            {'mission_solde' in t && t.mission_solde !== undefined && (t.mission_solde === 0) && (
                                                <div className="flex items-center gap-1 text-[10px] text-status-available font-medium bg-status-available/5 px-1.5 py-0.5 rounded border border-status-available/10 w-fit">
                                                    <span>Payé</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${t.type === 'Entrée' ? 'text-status-available' : 'text-destructive'
                                        }`}>
                                        {t.type === 'Entrée' ? '+' : '-'}{t.montant.toLocaleString()} {t.devise}
                                    </td>
                                </tr>
                            ))}
                            {(!filteredTransactions || filteredTransactions.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        Aucune transaction enregistrée pour cette période
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
