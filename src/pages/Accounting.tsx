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
import { MultiExpenseDialog } from '@/components/accounting/MultiExpenseDialog';
import { MultiIncomeDialog } from '@/components/accounting/MultiIncomeDialog';
import { exportToCSV, exportToPDF } from '@/services/exportService';
import { FileText, Download } from 'lucide-react';

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function Accounting() {
    const { data: transactions, isLoading } = useCaisse();
    const { soldeUSD, soldeCDF } = useSoldeCaisse();
    const { data: depenses } = useDepenses();

    // États pour le filtrage
    const [filterType, setFilterType] = useState<DateFilterType>('today');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isMultiExpenseOpen, setIsMultiExpenseOpen] = useState(false);
    const [isMultiIncomeOpen, setIsMultiIncomeOpen] = useState(false);

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
            case 'yesterday':
                const yesterday = subDays(now, 1);
                start = startOfDay(yesterday);
                end = endOfDay(yesterday);
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
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-primary/20 hover:bg-primary/5"
                        onClick={() => {
                            const now = new Date();
                            let start: Date;
                            let end: Date;

                            switch (filterType) {
                                case 'today':
                                    start = startOfDay(now);
                                    end = endOfDay(now);
                                    break;
                                case 'yesterday':
                                    const yest = subDays(now, 1);
                                    start = startOfDay(yest);
                                    end = endOfDay(yest);
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
                                    start = startOfDay(dateRange?.from || now);
                                    end = endOfDay(dateRange?.to || dateRange?.from || now);
                                    break;
                                default:
                                    start = startOfDay(now);
                                    end = endOfDay(now);
                            }

                            const startStr = format(start, 'dd/MM/yyyy');
                            const endStr = format(end, 'dd/MM/yyyy');
                            const dateString = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

                            exportToPDF(
                                filteredTransactions,
                                dateString,
                                {
                                    ...fluxPeriode,
                                    soldeUSD: soldePeriodeUSD,
                                    soldeCDF: soldePeriodeCDF
                                }
                            );
                        }}
                    >
                        <FileText className="h-4 w-4 text-primary" />
                        Exporter PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-status-available/20 hover:bg-status-available/5"
                        onClick={() => exportToCSV(filteredTransactions, `export_caisse_${format(new Date(), 'yyyyMMdd')}`)}
                    >
                        <Download className="h-4 w-4 text-status-available" />
                        Exporter CSV
                    </Button>
                    <div className="w-px h-8 bg-border mx-1 hidden sm:block" />
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsMultiExpenseOpen(true)}
                    >
                        <Receipt className="h-4 w-4" />
                        Nouvelle Dépense
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={() => setIsMultiIncomeOpen(true)}
                    >
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
                        variant={filterType === 'yesterday' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterType('yesterday')}
                        className="text-sm"
                    >
                        Hier
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
                {/* Entrées Card */}
                <Card className="border-status-available/20 bg-status-available/5 transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-status-available">Total Entrées</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-status-available/10 flex items-center justify-center">
                            <ArrowUpRight className="h-4 w-4 text-status-available" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-status-available">
                            +${fluxPeriode.entreesUSD.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-status-available/70">
                            +{fluxPeriode.entreesCDF.toLocaleString()} FC
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Toutes les recettes sur la période</p>
                    </CardContent>
                </Card>

                {/* Sorties Card */}
                <Card className="border-destructive/20 bg-destructive/5 transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive">Total Sorties</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                            <ArrowDownLeft className="h-4 w-4 text-destructive" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            -${fluxPeriode.sortiesUSD.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-destructive/70">
                            -{fluxPeriode.sortiesCDF.toLocaleString()} FC
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Toutes les dépenses sur la période</p>
                    </CardContent>
                </Card>

                {/* Résultat Net Card */}
                <Card className="border-primary/20 bg-primary/5 transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Résultat Net</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", soldePeriodeUSD >= 0 ? "text-primary" : "text-destructive")}>
                            {soldePeriodeUSD >= 0 ? '+' : ''}{soldePeriodeUSD.toLocaleString()} USD
                        </div>
                        <div className={cn("text-sm font-medium", soldePeriodeCDF >= 0 ? "text-primary/70" : "text-destructive/70")}>
                            {soldePeriodeCDF >= 0 ? '+' : ''}{soldePeriodeCDF.toLocaleString()} FC
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Bénéfice ou déficit sur la période</p>
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
            <MultiExpenseDialog
                open={isMultiExpenseOpen}
                onOpenChange={setIsMultiExpenseOpen}
            />
            <MultiIncomeDialog
                open={isMultiIncomeOpen}
                onOpenChange={setIsMultiIncomeOpen}
            />
        </div>
    );
}
