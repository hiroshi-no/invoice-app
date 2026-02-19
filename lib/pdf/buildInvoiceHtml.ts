// lib/pdf/buildInvoiceHtml.ts
import type { Branding } from './branding'

function escapeHtml(s: string) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function num(v: any) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function buildInvoiceHtml(args: {
  title?: string
  documentNo: string
  issuedAt: string
  customerName: string
  currency: string
  rows: Array<{ description: string | null; qty: number; unit: number; line: number }>
  totals: { subtotal: number; tax: number; total: number }
  branding: Branding
}) {
  const {
    title = 'INVOICE',
    documentNo,
    issuedAt,
    customerName,
    currency,
    rows,
    totals,
    branding,
  } = args

  const safeNo = escapeHtml(documentNo)
  const safeName = escapeHtml(customerName)
  const safeIssued = escapeHtml(issuedAt)
  const safeCurrency = escapeHtml(currency)
  const moneySuffix = currency === 'JPY' ? '¥' : safeCurrency

  const brand = escapeHtml(branding.brandColor)

  const cssClassic = `
    :root{ --brand:${brand}; }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial; padding:24px; color:#111;}
    .top{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;}
    .leftHead{display:flex; gap:12px; align-items:flex-start;}
    .logo{height:44px; max-width:220px; object-fit:contain;}
    .title{font-size:22px; font-weight:700; color:var(--brand);}
    .meta{font-size:12px; color:#444;}
    table{width:100%; border-collapse:collapse; margin-top:14px;}
    th,td{border:1px solid #ddd; padding:8px; font-size:12px;}
    th{background:#f5f5f5; text-align:left;}
    td.num{text-align:right;}
    .sum{margin-top:16px; display:flex; justify-content:flex-end;}
    .sum table{width:260px;}
    .sum th{background:#fff; border:none; padding:4px 0;}
    .sum td{border:none; padding:4px 0;}
    .sum tr+tr th, .sum tr+tr td{border-top:1px solid #eee;}
    .footer{margin-top:22px; font-size:11px; color:#666; border-top:1px solid #eee; padding-top:10px;}
  `

  const cssMinimal = `
    :root{ --brand:${brand}; }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial; padding:24px; color:#111;}
    .top{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;}
    .leftHead{display:flex; gap:10px; align-items:flex-start;}
    .logo{height:36px; max-width:200px; object-fit:contain;}
    .title{font-size:18px; font-weight:600;}
    .meta{font-size:12px; color:#444;}
    table{width:100%; border-collapse:collapse; margin-top:12px;}
    th,td{border-bottom:1px solid #eee; padding:8px; font-size:12px;}
    th{background:#fff; text-align:left; color:#111; border-top:1px solid #eee;}
    td.num{text-align:right;}
    .sum{margin-top:14px; display:flex; justify-content:flex-end;}
    .sum table{width:260px;}
    .sum th,.sum td{border:none; padding:3px 0;}
    .sum tr+tr th, .sum tr+tr td{border-top:1px solid #eee;}
    .footer{margin-top:18px; font-size:11px; color:#777; border-top:1px solid #eee; padding-top:10px;}
  `

  const chosenCss = branding.templateKey === 'minimal' ? cssMinimal : cssClassic

  const logoHtml = branding.logoDataUri ? `<img class="logo" src="${branding.logoDataUri}" />` : ''
  const footerHtml = branding.footerText ? `<div class="footer">${escapeHtml(branding.footerText)}</div>` : ''

  const bodyRows = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(String(r.description ?? ''))}</td>
        <td class="num">${num(r.qty).toLocaleString()}</td>
        <td class="num">${num(r.unit).toLocaleString()}</td>
        <td class="num">${num(r.line).toLocaleString()}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8" />
    <style>${chosenCss}</style>
    </head><body>
      <div class="top">
        <div>
          <div class="leftHead">
            ${logoHtml}
            <div>
              <div class="title">${escapeHtml(title)}</div>
              <div class="meta">No: ${safeNo}</div>
              <div class="meta">Issued: ${safeIssued}</div>
            </div>
          </div>
        </div>
        <div class="meta">
          <div><b>Bill To</b></div>
          <div>${safeName}</div>
        </div>
      </div>

      <div class="meta">Currency: ${safeCurrency}</div>

      <table>
        <thead>
          <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>

      <div class="sum">
        <table>
          <tr><th>Subtotal</th><td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td></tr>
          <tr><th>Tax</th><td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td></tr>
          <tr><th>Total</th><td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td></tr>
        </table>
      </div>

      ${footerHtml}
    </body></html>`
}
