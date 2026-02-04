import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TransactionWithDetails } from '@/hooks/useCaisse';

export const exportToCSV = (transactions: TransactionWithDetails[], fileName: string) => {
    const headers = ['Type', 'Date', 'Description', 'Source', 'Montant', 'Devise'];
    const rows = transactions.map(t => [
        t.type,
        t.date_transaction ? format(new Date(t.date_transaction), 'dd/MM/yyyy HH:mm') : '',
        t.description?.replace(/,/g, ';') || '',
        t.source_type || 'Manuel',
        t.montant,
        t.devise
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export interface ExportStats {
    entreesUSD: number;
    sortiesUSD: number;
    entreesCDF: number;
    sortiesCDF: number;
    soldeUSD: number;
    soldeCDF: number;
}

export const exportToPDF = (
    transactions: TransactionWithDetails[],
    periodName: string,
    stats: ExportStats
) => {
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('BOTES CAB - Rapport de Caisse', 14, 22);

    // Période et Date de génération
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'bold');
    doc.text(`Période : ${periodName}`, 14, 30);
    doc.setFont(undefined, 'normal');
    doc.text(`Généré le : ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, 36);

    // Résumé financier
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(10);
    doc.setTextColor(39, 174, 96); // Vert (Entrées)
    doc.text('TOTAL ENTRÉES :', 14, 50);
    doc.text(`+${stats.entreesUSD.toLocaleString()} USD`, 60, 50);
    doc.text(`+${stats.entreesCDF.toLocaleString()} FC`, 120, 50);

    doc.setTextColor(192, 57, 43); // Rouge (Sorties)
    doc.text('TOTAL SORTIES :', 14, 57);
    doc.text(`-${stats.sortiesUSD.toLocaleString()} USD`, 60, 57);
    doc.text(`-${stats.sortiesCDF.toLocaleString()} FC`, 120, 57);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RÉSULTAT NET :', 14, 66);
    doc.text(`${stats.soldeUSD >= 0 ? '+' : ''}${stats.soldeUSD.toLocaleString()} USD`, 60, 66);
    doc.text(`${stats.soldeCDF >= 0 ? '+' : ''}${stats.soldeCDF.toLocaleString()} FC`, 120, 66);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    // Tableau des transactions
    const tableColumn = ["Type", "Date", "Description", "Source", "Montant"];
    const tableRows = transactions.map(t => [
        t.type,
        t.date_transaction ? format(new Date(t.date_transaction), 'dd/MM/yyyy HH:mm') : '',
        t.description || '',
        t.source_type || 'Manuel',
        `${t.type === 'Entrée' ? '+' : '-'}${t.montant.toLocaleString()} ${t.devise}`
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 76,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
            4: { halign: 'right' }
        },
        didDrawCell: (data: any) => {
            // Coloration du montant
            if (data.section === 'body' && data.column.index === 4) {
                const text = data.cell.raw as string;
                if (text.startsWith('+')) {
                    doc.setTextColor(39, 174, 96); // Vert
                } else if (text.startsWith('-')) {
                    doc.setTextColor(192, 57, 43); // Rouge
                }
            }
        }
    });

    doc.save(`rapport_caisse_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};
