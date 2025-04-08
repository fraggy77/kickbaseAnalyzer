// Formatiert Geldbeträge in Euro mit Tausenderpunkten ohne Nachkommastellen
export const formatCurrency = (value: number = 0) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
};
