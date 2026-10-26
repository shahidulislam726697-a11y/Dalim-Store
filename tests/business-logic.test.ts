import { describe, it, expect } from 'vitest';
import { roundMoney, calculateSaleTotals, calculateLineTotal, calculateProfit } from '../src/lib/money.ts';
import { getInvoiceDateCode } from '../src/lib/dates.ts';
import { db } from '../src/db/index.ts';

describe('Dalim Store POS Business Logic Tests', () => {
  it('correctly rounds money half-up and avoids JavaScript float precision bugs', () => {
    // 0.1 + 0.2 in JS is 0.30000000000000004
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney('125.456')).toBe(125.46);
    expect(roundMoney('125.454')).toBe(125.45);
    expect(roundMoney(0)).toBe(0);
  });

  it('correctly calculates line total and profit using snapshots', () => {
    const lineTotal = calculateLineTotal(3, 420); // 3 * 420 = 1260
    expect(lineTotal).toBe(1260);

    const profit = calculateProfit(3, 370, 420); // 3 * (420 - 370) = 150
    expect(profit).toBe(150);
  });

  it('calculates sale totals, discount, paid and due accurately', () => {
    const items = [
      { qty: 2, sellPrice: 420 }, // 840
      { qty: 1, sellPrice: 145 }, // 145
    ];
    // Subtotal: 985, Discount: 35 -> Total: 950. Paid: 500 -> Due: 450
    const result = calculateSaleTotals(items, 35, 500);

    expect(result.subtotal).toBe(985);
    expect(result.discount).toBe(35);
    expect(result.total).toBe(950);
    expect(result.paid).toBe(500);
    expect(result.due).toBe(450);
  });

  it('generates consistent invoice date codes in Asia/Dhaka', () => {
    const code = getInvoiceDateCode();
    expect(code).toMatch(/^\d{8}$/); // YYYYMMDD format
  });

  it('rejects sale when product stock is insufficient', () => {
    // Product 1 has stock. Let's test requesting 999999 units
    const result = db.completeSale(1, {
      items: [{ productId: 1, qty: 999999 }],
      paid: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');
  });
});
