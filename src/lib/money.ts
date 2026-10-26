/**
 * Money and decimal math helpers.
 * Never uses raw JS float operations for critical business calculations.
 * Always handles paisa (cents) and rounds half-up to 2 decimals.
 */

export function toPaisa(amount: number | string): number {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function fromPaisa(paisa: number): number {
  return Math.round(paisa) / 100;
}

export function roundMoney(amount: number | string): number {
  return fromPaisa(toPaisa(amount));
}

export function formatMoney(amount: number | string, currencySymbol: string = '৳'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  const validNum = isNaN(num) ? 0 : num;
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(validNum);
  return `${currencySymbol}${formatted}`;
}

export function calculateLineTotal(qty: number, sellPrice: number): number {
  const qtyPaisa = Math.round(qty * 100);
  const pricePaisa = toPaisa(sellPrice);
  const totalPaisa = Math.round((qtyPaisa * pricePaisa) / 100);
  return fromPaisa(totalPaisa);
}

export function calculateProfit(qty: number, buyPrice: number, sellPrice: number): number {
  const lineTotal = calculateLineTotal(qty, sellPrice);
  const lineCost = calculateLineTotal(qty, buyPrice);
  return roundMoney(lineTotal - lineCost);
}

export function calculateSaleTotals(items: Array<{ qty: number; sellPrice: number }>, discount: number, paidInput: number) {
  let subtotalPaisa = 0;
  for (const item of items) {
    subtotalPaisa += toPaisa(calculateLineTotal(item.qty, item.sellPrice));
  }
  const subtotal = fromPaisa(subtotalPaisa);
  const discountVal = Math.max(0, roundMoney(discount));
  const total = Math.max(0, roundMoney(subtotal - discountVal));
  const paidVal = Math.max(0, Math.min(roundMoney(paidInput), total));
  const due = Math.max(0, roundMoney(total - paidVal));

  return {
    subtotal,
    discount: discountVal,
    total,
    paid: paidVal,
    due,
  };
}
