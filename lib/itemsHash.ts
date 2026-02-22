// lib/itemsHash.ts
import { createHash } from 'node:crypto'

export type DbItemRowForHash = {
  id?: string // ✅ optional にする
  position: number
  description: string | null
  quantity: number
  unit_price_amount: number
  line_subtotal_amount: number | null
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
  .map((r) => ({
    // ✅ sort専用（undefined回避）
    _sortId: String(r.id ?? ''),

    // ✅ position は数値化（sort用）
    position: Number(r.position ?? 0),

    // ✅ 文字列は null/undefined を吸収（ハッシュ用）
    description: String(r.description ?? ''),

    // ✅ 既存関数を使用
    quantity: normalizeIntStr(r.quantity),
    unit: normalizeIntStr(r.unit_price_amount),

    // line_subtotal_amount を使っているなら残す（使ってなければ削除OK）
    line: normalizeIntStr((r as any).line_subtotal_amount),
  }))
  .sort((a, b) => (a.position - b.position) || a._sortId.localeCompare(b._sortId))
  // ✅ ハッシュ材料に id を混ぜない
  .map(({ _sortId, ...rest }) => rest)

return createHash('sha256').update(JSON.stringify(norm)).digest('hex')
}
