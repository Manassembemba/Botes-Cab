import jsPDF from 'jsPDF';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { MissionWithDetails } from '@/hooks/useMissions';
import { supabase } from '@/integrations/supabase/client';

export async function generateInvoicePDF(mission: MissionWithDetails): Promise<void> {
  // Récupérer les paiements associés
  const { data: paiements } = await supabase
    .from('tb_paiements')
    .select('montant, methode_paiement')
    .eq('mission_id', mission.mission_id);

  const totauxPaiements: Record<string, number> = {};
  paiements?.forEach(p => {
    const methode = p.methode_paiement || 'Inconnu';
    totauxPaiements[methode] = (totauxPaiements[methode] || 0) + (p.montant || 0);
  });

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
    doc.addImage('/LOGO.png', 'PNG', pageWidth - 75, 12, 60, 22);
  } catch (e) {
    console.error("Impossible d'ajouter le logo à la facture:", e);
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
  
  const clientName = mission.client
    ? `${mission.client.titre || ''} ${mission.client.nom} ${mission.client.prenom || ''}`.trim()
    : (mission.client_nom || 'Client Occasionnel');
  doc.text(clientName.toUpperCase(), 15, 67);
  
  doc.setFont('helvetica', 'normal');
  if (mission.client?.telephone) {
    doc.text(mission.client.telephone, 15, 73);
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
  const invoiceNum = `BC${String(mission.mission_id).padStart(4, '0')}`;
  doc.text(invoiceNum, pageWidth - 20, 65, { align: 'right' });
  doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 20, 73, { align: 'right' });

  // 5. Tableau des articles
  const dateDepartFormatee = format(new Date(mission.date_depart_prevue), 'dd/MM/yyyy HH:mm', { locale: fr });
  
  const description = `${mission.type_course || 'Prestation'} - ${mission.vehicule ? mission.vehicule.marque + ' ' + mission.vehicule.modele : 'Véhicule'}\nDépart prévu : ${dateDepartFormatee}`;
  
  const totalAmount = mission.montant_total || 0;
  const acompte = mission.acompte || 0;
  const reste = totalAmount - acompte;
  const cautionAmount = mission.caution || 0;
  const deviseSymbol = (mission.devise === 'USD' || !mission.devise) ? '$' : 'CDF ';

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
  let currentY = finalY + 5;
  const colWidth = 30;
  const valWidth = 25;
  const labelX = pageWidth - 85;
  const valX = pageWidth - 20;

  doc.setFontSize(8);
  
  const drawTotalLine = (label: string, value: number, isFinal: boolean = false) => {
    if (isFinal) {
      doc.setFillColor(yellow[0], yellow[1], yellow[2]);
    } else {
      doc.setFillColor(itemRowBg[0], itemRowBg[1], itemRowBg[2]);
    }
    doc.rect(labelX, currentY, colWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(label, labelX + colWidth/2, currentY + 5, { align: 'center' });
    
    doc.rect(labelX + colWidth, currentY, valWidth, 7, 'F');
    doc.text(`${deviseSymbol}${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, valX, currentY + 5, { align: 'right' });
    currentY += 8;
  };

  drawTotalLine('RESTE', reste);
  drawTotalLine('CAUTION', cautionAmount);
  drawTotalLine('TOTAL', totalAmount, true);

  // Affichage des totaux par méthode de paiement
  currentY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Details des paiements :', 15, currentY);
  doc.setFont('helvetica', 'normal');
  Object.entries(totauxPaiements).forEach(([methode, montant]) => {
    currentY += 5;
    doc.text(`- ${methode}: ${deviseSymbol}${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, 20, currentY);
  });

  // 7. Termes et conditions
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Termes et conditions', 15, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Le paiement est non remboursable.', 15, currentY + 15);

  // 8. Bandeau de pied de page jaune
  doc.setFillColor(...yellow);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

  // Sauvegarde
  doc.save(`Facture_${invoiceNum}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
