export type PdfNameParams = {
  docType?: string | null
  documentNo?: string | null
  version?: number | null
}

function sanitizePart(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  // Windows等で危険な文字を除去
  return raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function labelForDocType(docType?: string | null) {
  const v = String(docType ?? '').trim().toLowerCase()
  if (v === 'invoice') return '請求書'
  if (v === 'quotation' || v === 'quote' || v === 'estimate') return '見積書'
  return '書類'
}

export function buildPdfFileName({
  docType,
  documentNo,
  version,
}: PdfNameParams) {
  const label = sanitizePart(labelForDocType(docType))
  const no = sanitizePart(documentNo) || 'document'
  const ver =
    Number.isFinite(Number(version)) && Number(version) > 0
      ? `v${Number(version)}`
      : 'v1'

  return `${label}_${no}_${ver}.pdf`
}