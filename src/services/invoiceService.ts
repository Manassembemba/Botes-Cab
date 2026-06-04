import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ReservationWithDetails } from '@/hooks/useReservations';

export function generateInvoicePDF(reservation: ReservationWithDetails): void {
  const doc = new jsPDF('p', 'mm', 'a5');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fonction pour nettoyer le texte (suppression accents, caractères spéciaux)
  const sanitizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/’/g, "'")
      .replace(/[^a-zA-Z0-9\s.,:;!?\-\(\)→]/g, " ");
  };

  // Couleurs
  const yellow = [255, 222, 0] as [number, number, number];
  const dark = [62, 62, 62] as [number, number, number];
  const itemRowBg = [255, 249, 230] as [number, number, number];
  const resteBg = [230, 230, 230] as [number, number, number];

  // 1. Demi-cercle supérieur jaune
  doc.setFillColor(...yellow);
  doc.ellipse(pageWidth / 2, 0, 45, 22, 'F');

  // 2. En-tête : BOTES CAB et Adresse
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('BOTES CAB', 15, 25);

  // Boîte d'adresse
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(15, 30, 90, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const rawAddress = "24 novembre, en diagonale de l’académie des beaux-arts réf station Ariana immeuble Kin béton 3e niveau local 17.";
  const addressLines = doc.splitTextToSize(sanitizeText(rawAddress), 85);
  doc.text(addressLines, 18, 35);

  // 3. Logo Image (à droite)
  try {
    // Le logo est dans public/LOGO.png, accessible via /LOGO.png au runtime
    doc.addImage('/LOGO.png', 'PNG', pageWidth - 75, 12, 60, 22);
  } catch (e) {
    console.error("Impossible d'ajouter le logo à la facture:", e);
    // Fallback texte si l'image échoue
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.text('BOTES CAB', pageWidth - 15, 24, { align: 'right' });
  }

  // Badge "FACTURE"
  doc.setDrawColor(...yellow);
  doc.setLineWidth(0.8);
  doc.rect(pageWidth - 55, 35, 40, 8);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - 35, 41, { align: 'center' });

  // 4. Informations Client et Méta (N°, Date)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Facturer à', 15, 60);
  
  const clientName = reservation.client
    ? `${reservation.client.titre || ''} ${reservation.client.nom} ${reservation.client.prenom || ''}`.trim()
    : (reservation.client_nom || 'Client Occasionnel');
  doc.text(clientName.toUpperCase(), 15, 67);
  
  doc.setFont('helvetica', 'normal');
  if (reservation.client?.telephone) {
    doc.text(reservation.client.telephone, 15, 73);
  }

  // Tableau Méta (Facture #, Date)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(pageWidth - 95, 60, 80, 16);
  doc.line(pageWidth - 95, 68, pageWidth - 15, 68);
  doc.line(pageWidth - 55, 60, pageWidth - 55, 76);

  doc.setFont('helvetica', 'bold');
  doc.text('Facture #', pageWidth - 90, 65);
  doc.text('Date émission', pageWidth - 90, 73);
  
  doc.setFont('helvetica', 'normal');
  const invoiceNum = `BC${String(reservation.reservation_id).padStart(4, '0')}`;
  doc.text(invoiceNum, pageWidth - 20, 65, { align: 'right' });
  doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 20, 73, { align: 'right' });

  // 5. Tableau des articles
  const dateDepartFormatee = format(new Date(reservation.date_depart_prevue), 'dd/MM/yyyy HH:mm', { locale: fr });
  
  const description = `${reservation.type_course || 'Location'} - ${reservation.vehicule ? reservation.vehicule.marque + ' ' + reservation.vehicule.modele : 'Véhicule'}\nDépart prévu : ${dateDepartFormatee}`;
  
  const totalAmount = reservation.montant_total || 0;
  const reste = (reservation.montant_total || 0) - (reservation.acompte || 0);
  const deviseSymbol = (reservation.devise === 'USD' || !reservation.devise) ? '$' : 'CDF ';

  autoTable(doc, {
    startY: 85,
    head: [['QTÉ', 'DESCRIPTION', 'PRIX UNITAIRE', 'MONTANT']],
    body: [
      ['1', description, 'PAYE', `${deviseSymbol}${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`],
    ],
    headStyles: {
      fillColor: false,
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fillColor: yellow, cellWidth: 20 },
      1: { halign: 'left', fillColor: yellow },
      2: { halign: 'center', fillColor: dark, textColor: 255, cellWidth: 45 },
      3: { halign: 'right', fillColor: dark, textColor: 255, cellWidth: 35, fontStyle: 'bold' },
    },
    bodyStyles: {
      fillColor: itemRowBg,
      textColor: 0,
      minCellHeight: 15,
      valign: 'middle',
    },
    theme: 'grid',
    styles: {
      lineColor: [255, 255, 255],
      lineWidth: 0.5,
      fontSize: 9,
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  // 6. Totaux (Reste, Caution, Total)
  const totalLabelX = pageWidth - 90;
  const totalValueX = pageWidth - 20;

  // Reste
  doc.setFillColor(...resteBg);
  doc.rect(totalLabelX, finalY + 2, 40, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('RESTE', pageWidth - 70, finalY + 8.5, { align: 'center' });
  
  doc.setFillColor(...itemRowBg);
  doc.rect(pageWidth - 50, finalY + 2, 35, 10, 'F');
  doc.text(`${deviseSymbol}${reste.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, totalValueX, finalY + 8.5, { align: 'right' });

  // Caution (Dynamique)
  const cautionAmount = reservation.caution || 0;
  doc.setFont('helvetica', 'bold');
  doc.text('Caution', pageWidth - 70, finalY + 18.5, { align: 'center' });
  doc.setFillColor(...itemRowBg);
  doc.rect(pageWidth - 50, finalY + 12, 35, 10, 'F');
  doc.text(`${deviseSymbol}${cautionAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, totalValueX, finalY + 18.5, { align: 'right' });

  // TOTAL FINAL
  doc.text('TOTAL', pageWidth - 70, finalY + 28.5, { align: 'center' });
  doc.setFillColor(...yellow);
  doc.rect(pageWidth - 50, finalY + 22, 35, 10, 'F');
  doc.setFontSize(12);
  doc.text(`${deviseSymbol}${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, totalValueX, finalY + 28.5, { align: 'right' });

  // 7. Termes et conditions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Termes et conditions', 15, finalY + 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Le paiement est non remboursable.', 15, finalY + 52);

  // 8. Bandeau de pied de page jaune
  doc.setFillColor(...yellow);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

  // Sauvegarde
  doc.save(`Facture_${invoiceNum}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
