import { useState } from 'react';
import { useCaisse, useSoldeCaisse } from '@/hooks/useCaisse';
import { useDepenses, useCreateDepense } from '@/hooks/useDepenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUpRight, ArrowDownLeft, Wallet, Receipt, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Accounting() {
    const { data: transactions, isLoading } = useCaisse();
    const { soldeUSD, soldeCDF } = useSoldeCaisse();
    const { data: depenses } = useDepenses();

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

            {/* Soldes Section */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solde Total (USD)</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">${soldeUSD.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Disponibles en caisse</p>
                    </CardContent>
                </Card>

                <Card className="bg-status-available/5 border-status-available/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solde Total (CDF)</CardTitle>
                        <Wallet className="h-4 w-4 text-status-available" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-status-available">{soldeCDF.toLocaleString()} FC</div>
                        <p className="text-xs text-muted-foreground mt-1">Disponibles en caisse</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Flux du mois</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Entrées</p>
                                <div className="text-lg font-semibold text-status-available">+$0</div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sorties</p>
                                <div className="text-lg font-semibold text-destructive">-$0</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Dernières Transactions</h3>
                    <Button variant="ghost" size="sm">Voir tout</Button>
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
                            {transactions?.map((t) => (
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
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                            {t.source_type || 'Manuel'}
                                        </Badge>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${t.type === 'Entrée' ? 'text-status-available' : 'text-destructive'
                                        }`}>
                                        {t.type === 'Entrée' ? '+' : '-'}{t.montant.toLocaleString()} {t.devise}
                                    </td>
                                </tr>
                            ))}
                            {(!transactions || transactions.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        Aucune transaction enregistrée
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
