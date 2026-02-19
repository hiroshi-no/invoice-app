// lib/itemsHash.ts
import { createHash } from 'node:crypto'

export type DbItemRowForHash = {
  id: string
  position: number | null
  description: string | null
  quantity: any
  unit_price_amount: any
}

function normalizeIntStr(v: any): string {
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'number') return String(Math.trunc(v))
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^-?\d+$/.test(s)) {
      try {
        return BigInt(s).toString()
      } catch {}
      return s.replace(/^(-?)0+(?=\d)/, '$1')
    }
    const n = Number(s)
    return Number.isFinite(n) ? String(Math.trunc(n)) : '0'
  }
  return '0'
}

function normalizeQtyStr(v: any): string {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : 0
  if (!Number.isFinite(n)) return '0.00'
  return (Math.round(n * 100) / 100).toFixed(2)
}

/**
 * document_items の DB行配列から hash を作る（position 基準で安定化）
 */
export function computeItemsHashFromDbRows(rows: DbItemRowForHash[]): string {
  const norm = rows
    .map((r, idx) => ({
      id: r.id,
      position: r.position ?? idx + 1,
      desc: (r.description ?? '').trim(),
      qty: normalizeQtyStr(r.quantity),
      unit: normalizeIntStr(r.unit_price_amount),
    }))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))

  return createHash('sha256').update(JSON.stringify(norm)).digest('hex')
}
