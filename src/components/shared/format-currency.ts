export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  return `₪ ${amount.toLocaleString()}`;
}
