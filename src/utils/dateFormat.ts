export function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format de rang de dates dd/mm/yyyy - dd/mm/yyyy
export function formatDateRangeDMY(start?: string | null, end?: string | null): string {
  const startFormatted = formatDateDMY(start);
  const endFormatted = formatDateDMY(end);
  if (startFormatted && endFormatted && startFormatted !== endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  return startFormatted || '';
}

// Suma dies a una data ISO i retorna YYYY-MM-DD
export function addDaysISO(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
