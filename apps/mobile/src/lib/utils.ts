export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function getPriceRange(range: number): string {
  return '₹'.repeat(range);
}
