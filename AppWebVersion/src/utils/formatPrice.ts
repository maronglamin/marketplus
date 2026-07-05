export function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'GMD' ? 'D' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toLocaleString()}`;
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
