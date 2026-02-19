// lib/calc.ts
export function calcTotals(subtotal: number, currency: string, taxRate = 0.1) {
  const s = Number(subtotal ?? 0)

  // JPYは小数を持たない想定。端数処理は好みで Math.floor / Math.round / Math.ceil に変更
  const tax =
    currency === 'JPY'
      ? Math.floor(s * taxRate)
      : Number((s * taxRate).toFixed(2))

  const total = s + tax

  return { subtotal: s, tax, total }
}
