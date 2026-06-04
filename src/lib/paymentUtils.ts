import { Banknote, Landmark, CreditCard } from 'lucide-react';
import React from 'react';

export const getIconForMethod = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('cash') || l.includes('espèce')) return React.createElement(Banknote, { className: "h-4 w-4" });
  if (l.includes('virement') || l.includes('bank')) return React.createElement(Landmark, { className: "h-4 w-4" });
  return React.createElement(CreditCard, { className: "h-4 w-4" }); // M-Pesa etc
};
