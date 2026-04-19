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

function nonEmpty(v: any) {
  return String(v ?? '').trim()
}

function joinLines(values: Array<any>) {
  return values.map((v) => nonEmpty(v)).filter(Boolean)
}

function renderInfoLines(lines: string[]) {
  if (!lines.length) return `<div class="muted">-</div>`
  return lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')
}

function detectDocType(args: { docType?: string; title?: string }) {
  const docType = nonEmpty(args.docType).toLowerCase()
  const title = nonEmpty(args.title)

  if (docType === 'quote' || docType === 'quotation') {
    return {
      docTypeLabel: '御見積書',
      docNoLabel: '見積番号',
      dateLabel: '有効期限',
    }
  }

  if (docType === 'invoice') {
    return {
      docTypeLabel: '御請求書',
      docNoLabel: '請求書番号',
      dateLabel: '支払期日',
    }
  }

  if (title.includes('見積')) {
    return {
      docTypeLabel: '御見積書',
      docNoLabel: '見積番号',
      dateLabel: '有効期限',
    }
  }

  return {
    docTypeLabel: '御請求書',
    docNoLabel: '請求書番号',
    dateLabel: '支払期日',
  }
}

type TemplateKey = Branding['templateKey']

type TemplateProfile = 'standard' | 'creator' | 'interior'

type BuildInvoiceHtmlArgs = {
  title?: string
  docType?: string
  documentNo: string
  issuedAt: string
  dueDate?: string
  notes?: string
  customerName: string
  customerHonorific?: string
  currency: string
  rows: Array<{ description: string | null; qty: number; unit: number; line: number }>
  totals: { subtotal: number; tax: number; total: number }
  branding: Branding
  templateProfile?: TemplateProfile
  creatorMeta?: {
    projectName?: string | null
    workPeriodFrom?: string | null
    workPeriodTo?: string | null
    deliveryDueDate?: string | null
    deliveryDate?: string | null
    deliverablesSummary?: string | null
    deliveryFormat?: string | null
    revisionRoundsIncluded?: number | null
    usageScopeNote?: string | null
    rightsTreatmentNote?: string | null
    paymentTermsNote?: string | null
    paymentMethodNote?: string | null
    withholdingTaxEnabled?: boolean | null
    withholdingTaxAmount?: number | null
  }
  interiorMeta?: {
    projectName?: string | null
    siteName?: string | null
    siteAddress?: string | null
    constructionPeriodFrom?: string | null
    constructionPeriodTo?: string | null
    estimateValidUntil?: string | null
    billingType?: string | null
    paymentTermsNote?: string | null
    scopeIncludedNote?: string | null
    scopeExcludedNote?: string | null
    previousBilledAmount?: number | null
    currentBilledAmount?: number | null
    remainingAmount?: number | null
  }
  customer?: {
    postalCode?: string | null
    address1?: string | null
    address2?: string | null
    email?: string | null
    phone?: string | null
  }
  issuer?: {
    name?: string | null
    postalCode?: string | null
    address1?: string | null
    address2?: string | null
    email?: string | null
    phone?: string | null
    fax?: string | null
  }
  fontCss?: string
}

type RenderPartsArgs = {
  templateKey: TemplateKey
  templateProfile: TemplateProfile
  safeTitle: string
  safeCustomTitle: string
  customerDisplayName: string
  customerLines: string[]
  docNoLabel: string
  safeNo: string
  safeIssued: string
  safeDateLabel: string
  safeDueDate: string
  logoHtml: string
  issuerName: string
  issuerLines: string[]
  bodyRows: string
  totals: { subtotal: number; tax: number; total: number }
  moneySuffix: string
  notesHtml: string
  footerHtml: string
  creatorMeta?: BuildInvoiceHtmlArgs['creatorMeta']
  interiorMeta?: BuildInvoiceHtmlArgs['interiorMeta']
}

/* =========================
 * CSS
 * ========================= */

function getBaseCss(fontCss: string, brand: string) {
  return `
    ${fontCss}

    :root {
      --brand: ${brand};
      --brand-soft: color-mix(in srgb, var(--brand) 8%, #ffffff 92%);
      --brand-strong: color-mix(in srgb, var(--brand) 85%, #000 15%);
      --text: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --line-soft: #f1f5f9;
      --soft-bg: #f8fafc;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: var(--text);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      text-rendering: geometricPrecision;
      font-family:
        'InvoiceJP',
        'Noto Sans JP',
        'Hiragino Kaku Gothic ProN',
        'Hiragino Sans',
        'Yu Gothic',
        'Meiryo',
        sans-serif;
    }

    body {
      font-size: 12px;
      line-height: 1.6;
    }

    body, table, th, td, div, span, p, small, strong, b {
      font-family: inherit;
    }

    .page {
      width: 100%;
    }

    .logo {
      display: block;
      object-fit: contain;
    }

    .docTitle {
      margin: 0 0 18px;
      line-height: 1.35;
      text-align: left;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .docSubTitle {
      margin: -8px 0 18px;
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
      line-height: 1.5;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .sectionBlock {
      break-inside: avoid;
    }

    .sectionStrong {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .metaRow {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 3px 0;
    }

    .metaLabel {
      color: var(--muted);
      white-space: nowrap;
    }

    .metaValue {
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .muted {
      color: var(--muted);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-family: inherit;
    }

    th, td {
      font-family: inherit;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    td.num, th.num {
      text-align: right;
      white-space: nowrap;
    }

    .sumLabel {
      font-weight: 600;
    }

    .totalRow th,
    .totalRow td {
      font-weight: 700;
    }

    .noteSection {
      margin-top: 26px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--soft-bg);
      overflow: hidden;
      break-inside: avoid;
    }

    .noteHeader {
      padding: 10px 14px;
      border-bottom: 1px solid var(--line);
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      background: rgba(255,255,255,0.6);
      letter-spacing: 0.03em;
    }

    .noteBody {
      padding: 14px;
      font-size: 12px;
      color: var(--text);
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      min-height: 56px;
    }

    .footer {
      margin-top: 22px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: 11px;
    }

    @media print {
      .headerTop, .sectionBlock, .noteSection {
        break-inside: avoid;
      }
    }
  `
}

function getLayoutCss() {
  return `
    body {
      padding: 30px;
    }

    .page {
      width: 100%;
    }

    .headerTop {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 40px;
      margin-bottom: 24px;
    }

    .headerLeft {
      flex: 1 1 auto;
      min-width: 0;
    }

    .headerRight {
      width: 300px;
      min-width: 300px;
    }

    .logoWrap {
      margin-bottom: 12px;
    }

    .sectionBlock + .sectionBlock {
      margin-top: 18px;
    }

    .headerRight .sectionBlock {
      text-align: right;
    }

    .headerRight .logoWrap {
      display: flex;
      justify-content: flex-end;
    }

    .sum {
      margin-top: 22px;
      display: flex;
      justify-content: flex-end;
    }

    .sum table {
      width: 320px;
      margin-top: 0;
    }
  `
}

function getPartialCss() {
  return `
    .itemsTable { width: 100%; }
    .notesWrap { margin-top: 0; }

    .sectionCaption {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .metaCardGrid {
      display: grid;
      gap: 10px;
    }

    .metaCard {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 10px 12px;
      background: #fff;
    }

    .metaCardLabel {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }

    .metaCardValue {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .metaTable {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }

    .metaTable th,
    .metaTable td {
      padding: 8px 10px;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .metaTable th {
      text-align: left;
      background: #f8fafc;
      color: #334155;
      white-space: nowrap;
      width: 38%;
    }

    .metaTable td {
      text-align: right;
      background: #fff;
      color: #111827;
      font-weight: 700;
    }

    .totalsCard {
      margin-top: 0;
    }

    .notesFrame-elegant {
      padding: 10px 0 0;
    }

    .sum-modern table {
      border-radius: 18px;
    }

    .sum-corporate table {
      border-radius: 0;
    }

    .notesWrap-modern .noteSection {
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
    }

    .notesWrap-elegant .noteSection {
      border-radius: 10px;
      border-width: 1px;
      background: #fffdfb;
    }

    .notesWrap-elegant .noteHeader {
      background: transparent;
      border-bottom: 1px solid #e7e5e4;
      color: #78716c;
      padding-left: 0;
      padding-right: 0;
    }

    .notesWrap-elegant .noteBody {
      padding-left: 0;
      padding-right: 0;
      color: #44403c;
    }

    .notesWrap-corporate .noteSection {
      border-radius: 6px;
    }

    .headerTop-modern .headerRight,
    .headerTop-corporate .headerRight {
      display: grid;
      gap: 14px;
    }

    .sectionBlock-modernMeta,
    .sectionBlock-modernIssuer,
    .sectionBlock-corporateIssuer,
    .sectionBlock-corporateMeta {
      margin-top: 0 !important;
    }

        .profileSection {
      margin-top: 18px;
      display: grid;
      gap: 12px;
      break-inside: avoid;
    }

    .profileSectionTitle {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      letter-spacing: 0.04em;
      margin-top: 6px;
    }

    .profileBlock {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fff;
      overflow: hidden;
    }

    .profileTable {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }

    .profileTable th,
    .profileTable td {
      padding: 9px 10px;
      font-size: 12px;
      border-bottom: 1px solid #eef2f7;
      word-break: break-word;
      overflow-wrap: anywhere;
      background: #fff;
    }

    .profileTable tr:last-child th,
    .profileTable tr:last-child td {
      border-bottom: none;
    }

    .profileTable th {
      width: 34%;
      text-align: left;
      color: #64748b;
      background: #f8fafc;
      font-weight: 700;
      white-space: nowrap;
    }

    .profileTable td {
      color: #111827;
      font-weight: 600;
    }
  `
}

function getClassicCss() {
  return `
    body { padding: 32px; }

    .headerTop {
      gap: 42px;
      margin-bottom: 26px;
      padding-bottom: 18px;
      border-bottom: 1px solid #d1d5db;
    }

    .headerRight { width: 300px; min-width: 300px; }

    .logo { height: 46px; max-width: 230px; }

    .docTitle {
      font-size: 32px;
      font-weight: 800;
      color: var(--brand);
      letter-spacing: 0.09em;
      margin: 0 0 24px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--brand);
      line-height: 1.3;
    }

    .sectionBlock + .sectionBlock { margin-top: 22px; }

    .sectionStrong {
      font-size: 22px;
      line-height: 1.55;
      margin-bottom: 10px;
    }

    .metaRow { padding: 5px 0; gap: 14px; }

    .metaLabel {
      color: #6b7280;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    .metaValue {
      color: #111827;
      font-size: 12px;
      font-weight: 700;
    }

    .headerRight .sectionStrong {
      font-size: 15px;
      margin-bottom: 6px;
      line-height: 1.45;
    }

    table {
      margin-top: 20px;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #d1d5db;
    }

    th, td {
      padding: 10px 10px;
      font-size: 12px;
    }

    th {
      background: linear-gradient(to bottom, var(--brand), var(--brand-strong));
      color: #fff;
      text-align: left;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #cbd5e1;
    }

    th:first-child { border-top-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; }

    td {
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #eef2f7;
      background: #fff;
    }

    td:last-child { border-right: none; }
    tbody tr:last-child td { border-bottom: none; }

    .sum { margin-top: 24px; }

    .sum table {
      width: 330px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }

    .sum th,
    .sum td {
      border: none;
      padding: 9px 12px;
      font-size: 12px;
      background: #fff;
    }

    .sum tr + tr th,
    .sum tr + tr td {
      border-top: 1px solid #eceff3;
    }

    .sumLabel { color: #4b5563; }

    .totalRow th,
    .totalRow td {
      color: var(--brand);
      font-size: 15px;
      font-weight: 800;
      background: #fafafa;
    }

    .noteSection {
      margin-top: 28px;
      border-color: #d1d5db;
      background: #fafafa;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .noteHeader { background: #f3f4f6; }

    .footer {
      color: #666;
      border-top: 1px solid #d1d5db;
      padding-top: 12px;
      margin-top: 30px;
      line-height: 1.7;
    }
  `
}

function getMinimalCss() {
  return `
    body { padding: 34px; }

    .headerTop {
      gap: 48px;
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }

    .headerRight { width: 280px; min-width: 280px; }

    .logo { height: 28px; max-width: 150px; }

    .docTitle {
      font-size: 25px;
      font-weight: 700;
      color: #111827;
      letter-spacing: 0.1em;
      margin: 0 0 24px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      line-height: 1.35;
    }

    .sectionBlock + .sectionBlock { margin-top: 24px; }

    .sectionStrong {
      font-size: 20px;
      line-height: 1.55;
      margin-bottom: 10px;
    }

    .metaRow { padding: 4px 0; gap: 16px; }

    .metaLabel {
      color: #64748b;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    .metaValue {
      color: #111827;
      font-size: 12px;
      font-weight: 600;
    }

    .headerRight .sectionStrong {
      font-size: 14px;
      margin-bottom: 6px;
      line-height: 1.45;
    }

    table {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }

    th, td {
      padding: 10px 8px;
      font-size: 12px;
    }

    th {
      background: #f8fafc;
      color: #334155;
      text-align: left;
      font-weight: 700;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #cbd5e1;
      letter-spacing: 0.03em;
    }

    td { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child td { border-bottom: none; }

    .sum { margin-top: 24px; }

    .sum table {
      width: 320px;
      border: none;
      border-top: 1px solid #cbd5e1;
      border-bottom: none;
    }

    .sum th,
    .sum td {
      border: none;
      padding: 8px 0;
      font-size: 12px;
      background: transparent;
    }

    .sum tr + tr th,
    .sum tr + tr td {
      border-top: 1px solid #f1f5f9;
    }

    .sumLabel { color: #475569; }

    .totalRow {
      border-top: 1px solid #cbd5e1;
    }

    .totalRow th,
    .totalRow td {
      color: #111827;
      font-size: 14px;
      font-weight: 700;
      padding-top: 10px;
      padding-bottom: 10px;
      background: #fafafa;
    }

    .totalRow th {
      padding-left: 10px;
      border-radius: 8px 0 0 8px;
    }

    .totalRow td {
      padding-right: 10px;
      border-radius: 0 8px 8px 0;
    }

    .noteSection {
      margin-top: 24px;
      border-color: #e5e7eb;
      background: #fff;
    }

    .noteHeader { background: #fafafa; }

    .footer {
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 30px;
      line-height: 1.7;
    }
  `
}

function getModernCss() {
  return `
    body {
      padding: 30px;
      background: #fff;
    }

    .page {
      position: relative;
      background: #fff;
      border-radius: 20px;
    }

    .page::before {
      content: '';
      display: block;
      height: 10px;
      width: 100%;
      background: linear-gradient(90deg, var(--brand), var(--brand-strong));
      border-radius: 999px;
      margin-bottom: 22px;
    }

    .headerTop {
      gap: 44px;
      margin-bottom: 26px;
    }

    .logo { height: 34px; max-width: 180px; }

    .docTitle {
      font-size: 30px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.08em;
      margin: 0 0 10px;
      line-height: 1.3;
    }

    .docSubTitle {
      margin: 0 0 22px;
      padding: 10px 14px;
      background: #f8fafc;
      border-left: 4px solid var(--brand);
      border-radius: 10px;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
    }

    .headerLeft .sectionBlock {
      padding: 16px 18px;
      border: 1px solid #e5e7eb;
      border-left: 4px solid var(--brand);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }

    .headerRight .sectionBlock {
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }

    .sectionStrong {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.5;
      margin-bottom: 8px;
      color: #0f172a;
    }

    .sectionBlock-modernMeta {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
    }

    .sectionBlock-modernIssuer {
      padding: 16px 18px;
    }

    .sectionBlock-modernCustomer {
      padding: 16px 18px;
    }

    .headerRight .sectionStrong {
      font-size: 15px;
      margin-bottom: 8px;
    }

    .metaRow {
      padding: 5px 0;
      gap: 14px;
      align-items: flex-start;
    }

    .metaLabel {
      color: #64748b;
      font-size: 11px;
      letter-spacing: 0.05em;
      font-weight: 700;
    }

    .metaValue {
      color: #0f172a;
      font-size: 12px;
      font-weight: 700;
    }

    .meta-stack {
     display: grid;
     gap: 10px;
    }

    .meta-card {
     padding: 12px 14px;
     border-radius: 14px;
    }

    .meta-card-row {
     display: flex;
     justify-content: space-between;
     gap: 10px;
     padding: 2px 0;
    }

    .meta-card-label {
      font-size: 11px;
     opacity: 0.72;
    }

    .meta-card-value {
     font-size: 13px;
     font-weight: 700;
     line-height: 1.45;
    }

    .header-logo-wrap {
     margin-bottom: 10px;
    }

    table {
      margin-top: 18px;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }

    th, td {
      padding: 11px 12px;
      font-size: 12px;
    }

    th {
      background: #0f172a;
      color: #fff;
      text-align: left;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #0f172a;
    }

    td {
      background: #fff;
      border-bottom: 1px solid #eef2f7;
    }

    tbody tr:nth-child(even) td {
      background: #fafcff;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .sum { margin-top: 24px; }

    .sum table {
      width: 340px;
      border: none;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
    }

    .sum th,
    .sum td {
      border: none;
      padding: 11px 14px;
      background: #fff;
    }

    .sum tr + tr th,
    .sum tr + tr td {
      border-top: 1px solid #eef2f7;
    }

    .sumLabel {
      color: #475569;
      font-weight: 700;
    }

    .totalRow th,
    .totalRow td {
      background: var(--brand-soft);
      color: #0f172a;
      font-size: 15px;
      font-weight: 800;
    }

    .noteSection {
      margin-top: 28px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
    }

    .noteHeader {
      background: var(--brand-soft);
      color: #475569;
      border-bottom: 1px solid #e5e7eb;
    }

    .footer {
      color: #64748b;
      margin-top: 28px;
      line-height: 1.8;
    }

    .headerTop-modern .headerRight {
      display: grid;
      gap: 14px;
    }
  `
}

function getElegantCss() {
  return `
    body {
      padding: 34px;
      color: #1f2937;
      background: #fafaf9;
    }

    .page {
      padding: 28px;
      border: 1px solid #e7e5e4;
      background: #fff;
    }

    .headerTop {
      gap: 40px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #d6d3d1;
    }

    .headerRight {
      width: 290px;
      min-width: 290px;
    }

    .logo {
      height: 30px;
      max-width: 170px;
      opacity: 0.95;
    }

    .docTitle {
      font-size: 29px;
      font-weight: 700;
      color: #3f3f46;
      letter-spacing: 0.12em;
      margin: 0 0 14px;
      line-height: 1.35;
      font-family:
        'InvoiceJP',
        'Noto Serif JP',
        'Hiragino Mincho ProN',
        'Yu Mincho',
        serif;
    }

    .docSubTitle {
      margin: 0 0 20px;
      color: #78716c;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.7;
    }

    .sectionBlock + .sectionBlock { margin-top: 22px; }

    .sectionStrong {
      font-size: 20px;
      font-weight: 700;
      color: #292524;
      margin-bottom: 8px;
      line-height: 1.55;
    }

    .headerRight .sectionStrong {
      font-size: 14px;
      margin-bottom: 6px;
    }

    .metaRow {
      padding: 4px 0;
      gap: 14px;
    }

    .metaLabel {
      color: #78716c;
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    .metaValue {
      color: #292524;
      font-size: 12px;
      font-weight: 600;
    }

    table {
      margin-top: 20px;
      border-top: 2px solid #a8a29e;
      border-bottom: 1px solid #d6d3d1;
    }

    th, td {
      padding: 11px 8px;
      font-size: 12px;
    }

    th {
      background: #fafaf9;
      color: #44403c;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid #d6d3d1;
      letter-spacing: 0.05em;
    }

    td {
      border-bottom: 1px solid #f1f0ee;
      color: #292524;
    }

    tbody tr:last-child td { border-bottom: none; }

    .sum { margin-top: 24px; }

    .sum table {
      width: 320px;
      border: none;
      border-top: 1px solid #d6d3d1;
    }

    .sum th,
    .sum td {
      border: none;
      background: transparent;
      padding: 9px 0;
    }

    .sum tr + tr th,
    .sum tr + tr td {
      border-top: 1px solid #f1f0ee;
    }

    .sumLabel {
      color: #57534e;
      font-weight: 600;
    }

    .totalRow th,
    .totalRow td {
      border-top: 1px solid #a8a29e;
      color: #292524;
      font-size: 14px;
      font-weight: 700;
      background: #fcfbfa;
    }

    .notes-section {
      margin-top: 26px;
      padding: 14px 16px;
     border: 1px solid rgba(17, 24, 39, 0.10);
     border-radius: 12px;
      background: rgba(255, 255, 255, 0.72);
    }

    .notes-title {
     font-size: 11px;
     font-weight: 700;
      letter-spacing: 0.08em;
     color: rgba(17, 24, 39, 0.72);
     margin-bottom: 8px;
    }

    .notes-body {
     font-size: 12px;
     line-height: 1.85;
     color: rgba(17, 24, 39, 0.88);
    }

    .section-divider {
     border-top: 1px solid rgba(17, 24, 39, 0.08);
    }

    .noteHeader {
      background: #f7f5f4;
      color: #78716c;
      border-bottom: 1px solid #e7e5e4;
    }

    .footer {
      margin-top: 30px;
      color: #78716c;
      border-top: 1px solid #e7e5e4;
      padding-top: 12px;
      line-height: 1.8;
    }

    .sectionCaption-elegant {
      color: #a8a29e;
      letter-spacing: 0.08em;
    }

    .headerTop-elegant .headerRight {
      display: grid;
      gap: 14px;
    }

    .sectionBlock-elegantCustomer,
    .sectionBlock-elegantMeta,
    .sectionBlock-elegantIssuer {
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
    }
  `
}

function getCorporateCss() {
  return `
    body { padding: 28px; }

    .headerTop {
      gap: 34px;
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 2px solid #94a3b8;
    }

    .headerRight { width: 320px; min-width: 320px; }

    .logo { height: 34px; max-width: 180px; }

    .docTitle {
      font-size: 30px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.08em;
      margin: 0 0 18px;
      line-height: 1.3;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 6px;
    }

    .docSubTitle {
      margin: -6px 0 18px;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.6;
    }

    .sectionBlock + .sectionBlock { margin-top: 18px; }

    .sectionStrong {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
      line-height: 1.45;
      color: #0f172a;
    }

    .headerRight .sectionStrong {
      font-size: 14px;
      margin-bottom: 6px;
    }

    .metaRow {
      padding: 4px 0;
      gap: 12px;
    }

    .metaLabel {
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .metaValue {
      color: #0f172a;
      font-size: 12px;
      font-weight: 700;
    }

    table {
      margin-top: 16px;
      border-collapse: collapse;
      border: 1px solid #94a3b8;
    }

    th, td {
      padding: 9px 10px;
      font-size: 12px;
    }

    th {
      background: #e2e8f0;
      color: #0f172a;
      text-align: left;
      font-weight: 800;
      border: 1px solid #94a3b8;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    td {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #111827;
    }

    .items-table th {
     padding: 10px 12px;
     font-size: 12px;
      font-weight: 700;
     line-height: 1.4;
    }

    .items-table td {
     padding: 11px 12px;
      font-size: 12px;
     line-height: 1.55;
     vertical-align: top;
    }

    .items-table th.num,
    .items-table td.num {
      text-align: right;
     white-space: nowrap;
    }

    .totals-table td {
     padding: 7px 0;
      font-size: 12px;
     line-height: 1.5;
    }

    .totals-table .total-row td {
     font-size: 14px;
     font-weight: 700;
    }

    .sum { margin-top: 18px; }

    .sum table {
      width: 330px;
      border: 1px solid #94a3b8;
      background: #fff;
    }

    .sum th,
    .sum td {
      padding: 9px 10px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }

    .sumLabel {
      color: #334155;
      font-weight: 700;
    }

    .totalRow th,
    .totalRow td {
      background: #e2e8f0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 800;
    }

    .noteSection {
      margin-top: 24px;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      background: #fff;
    }

    .noteHeader {
      background: #f1f5f9;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
    }

    .footer {
      margin-top: 24px;
      color: #475569;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      line-height: 1.7;
    }

    .sectionCaption-corporate {
      color: #334155;
      letter-spacing: 0.05em;
    }

    .headerTop-corporate .headerRight {
      display: grid;
      gap: 14px;
    }

    .sectionBlock-corporateIssuer,
    .sectionBlock-corporateMeta,
    .sectionBlock-corporateCustomer {
      background: #fff;
      border: 1px solid #cbd5e1;
      padding: 12px;
    }

    .metaTable-corporate th {
      background: #f1f5f9;
      font-weight: 800;
    }

    .metaTable-corporate td {
      background: #fff;
    }

    .totalsCard-corporate th,
    .totalsCard-corporate td {
      font-size: 12px;
    }
  `
}

function getTemplateCss(templateKey: TemplateKey) {
  switch (templateKey) {
    case 'minimal':
      return getMinimalCss()
    case 'modern':
      return getModernCss()
    case 'elegant':
      return getElegantCss()
    case 'corporate':
      return getCorporateCss()
    case 'classic':
    default:
      return getClassicCss()
  }
}

/* =========================
 * Header partials
 * ========================= */

function renderHeaderClassic(args: RenderPartsArgs) {
  const {
    safeTitle,
    safeCustomTitle,
    customerDisplayName,
    customerLines,
    docNoLabel,
    safeNo,
    safeIssued,
    safeDateLabel,
    safeDueDate,
    logoHtml,
    issuerName,
    issuerLines,
  } = args

  return `
    <div class="headerTop">
      <div class="headerLeft">
        <div class="docTitle">${safeTitle}</div>
        ${safeCustomTitle ? `<div class="docSubTitle">${safeCustomTitle}</div>` : ''}

        <div class="sectionBlock">
          <div class="sectionStrong">${escapeHtml(customerDisplayName)}</div>
          ${renderInfoLines(customerLines)}
        </div>
      </div>

      <div class="headerRight">
        <div class="sectionBlock">
          <div class="metaRow">
            <div class="metaLabel">${escapeHtml(docNoLabel)}</div>
            <div class="metaValue">${safeNo}</div>
          </div>
          <div class="metaRow">
            <div class="metaLabel">発行日</div>
            <div class="metaValue">${safeIssued}</div>
          </div>
          <div class="metaRow">
            <div class="metaLabel">${safeDateLabel}</div>
            <div class="metaValue">${safeDueDate}</div>
          </div>
        </div>

        <div class="sectionBlock">
          ${logoHtml}
          <div class="sectionStrong">${escapeHtml(issuerName)}</div>
          ${renderInfoLines(issuerLines)}
        </div>
      </div>
    </div>
  `
}

function renderHeaderModern(args: RenderPartsArgs) {
  const {
    safeTitle,
    safeCustomTitle,
    customerDisplayName,
    customerLines,
    docNoLabel,
    safeNo,
    safeIssued,
    safeDateLabel,
    safeDueDate,
    logoHtml,
    issuerName,
    issuerLines,
  } = args

  return `
    <div class="headerTop headerTop-modern">
      <div class="headerLeft">
        <div class="docTitle">${safeTitle}</div>
        ${safeCustomTitle ? `<div class="docSubTitle">${safeCustomTitle}</div>` : ''}

        <div class="sectionBlock sectionBlock-modernCustomer">
          <div class="sectionCaption">請求先</div>
          <div class="sectionStrong">${escapeHtml(customerDisplayName)}</div>
          ${renderInfoLines(customerLines)}
        </div>
      </div>

      <div class="headerRight">
        <div class="sectionBlock sectionBlock-modernMeta">
          <div class="metaCardGrid">
            <div class="metaCard">
              <div class="metaCardLabel">${escapeHtml(docNoLabel)}</div>
              <div class="metaCardValue">${safeNo}</div>
            </div>
            <div class="metaCard">
              <div class="metaCardLabel">発行日</div>
              <div class="metaCardValue">${safeIssued}</div>
            </div>
            <div class="metaCard">
              <div class="metaCardLabel">${safeDateLabel}</div>
              <div class="metaCardValue">${safeDueDate}</div>
            </div>
          </div>
        </div>

        <div class="sectionBlock sectionBlock-modernIssuer">
          ${logoHtml}
          <div class="sectionCaption">発行者</div>
          <div class="sectionStrong">${escapeHtml(issuerName)}</div>
          ${renderInfoLines(issuerLines)}
        </div>
      </div>
    </div>
  `
}

function renderHeaderElegant(args: RenderPartsArgs) {
  const {
    safeTitle,
    safeCustomTitle,
    customerDisplayName,
    customerLines,
    docNoLabel,
    safeNo,
    safeIssued,
    safeDateLabel,
    safeDueDate,
    logoHtml,
    issuerName,
    issuerLines,
  } = args

  return `
    <div class="headerTop headerTop-elegant">
      <div class="headerLeft">
        <div class="docTitle">${safeTitle}</div>
        ${safeCustomTitle ? `<div class="docSubTitle">${safeCustomTitle}</div>` : ''}

        <div class="sectionBlock sectionBlock-elegantCustomer">
          <div class="sectionCaption sectionCaption-elegant">お宛名</div>
          <div class="sectionStrong">${escapeHtml(customerDisplayName)}</div>
          ${renderInfoLines(customerLines)}
        </div>
      </div>

      <div class="headerRight">
        <div class="sectionBlock sectionBlock-elegantMeta">
          <div class="metaRow">
            <div class="metaLabel">${escapeHtml(docNoLabel)}</div>
            <div class="metaValue">${safeNo}</div>
          </div>
          <div class="metaRow">
            <div class="metaLabel">発行日</div>
            <div class="metaValue">${safeIssued}</div>
          </div>
          <div class="metaRow">
            <div class="metaLabel">${safeDateLabel}</div>
            <div class="metaValue">${safeDueDate}</div>
          </div>
        </div>

        <div class="sectionBlock sectionBlock-elegantIssuer">
          ${logoHtml}
          <div class="sectionCaption sectionCaption-elegant">発行者</div>
          <div class="sectionStrong">${escapeHtml(issuerName)}</div>
          ${renderInfoLines(issuerLines)}
        </div>
      </div>
    </div>
  `
}

function renderHeaderCorporate(args: RenderPartsArgs) {
  const {
    safeTitle,
    safeCustomTitle,
    customerDisplayName,
    customerLines,
    docNoLabel,
    safeNo,
    safeIssued,
    safeDateLabel,
    safeDueDate,
    logoHtml,
    issuerName,
    issuerLines,
  } = args

  return `
    <div class="headerTop headerTop-corporate">
      <div class="headerLeft">
        <div class="docTitle">${safeTitle}</div>
        ${safeCustomTitle ? `<div class="docSubTitle">${safeCustomTitle}</div>` : ''}

        <div class="sectionBlock sectionBlock-corporateCustomer">
          <div class="sectionCaption sectionCaption-corporate">請求先</div>
          <div class="sectionStrong">${escapeHtml(customerDisplayName)}</div>
          ${renderInfoLines(customerLines)}
        </div>
      </div>

      <div class="headerRight">
        <div class="sectionBlock sectionBlock-corporateIssuer">
          ${logoHtml}
          <div class="sectionCaption sectionCaption-corporate">発行者情報</div>
          <div class="sectionStrong">${escapeHtml(issuerName)}</div>
          ${renderInfoLines(issuerLines)}
        </div>

        <div class="sectionBlock sectionBlock-corporateMeta">
          <table class="metaTable metaTable-corporate">
            <tbody>
              <tr>
                <th>${escapeHtml(docNoLabel)}</th>
                <td>${safeNo}</td>
              </tr>
              <tr>
                <th>発行日</th>
                <td>${safeIssued}</td>
              </tr>
              <tr>
                <th>${safeDateLabel}</th>
                <td>${safeDueDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function renderHeader(args: RenderPartsArgs) {
  switch (args.templateKey) {
    case 'minimal':
      return renderHeaderClassic(args)
    case 'modern':
      return renderHeaderModern(args)
    case 'elegant':
      return renderHeaderElegant(args)
    case 'corporate':
      return renderHeaderCorporate(args)
    case 'classic':
    default:
      return renderHeaderClassic(args)
  }
}

/* =========================
 * Items table partials
 * ========================= */

function renderItemsTableClassic(args: RenderPartsArgs) {
  return `
    <table class="itemsTable itemsTable-classic">
      <thead>
        <tr>
          <th>内容</th>
          <th class="num">数量</th>
          <th class="num">単価</th>
          <th class="num">金額</th>
        </tr>
      </thead>
      <tbody>${args.bodyRows}</tbody>
    </table>
  `
}

function renderItemsTableMinimal(args: RenderPartsArgs) {
  return `
    <table class="itemsTable itemsTable-minimal">
      <thead>
        <tr>
          <th>内容</th>
          <th class="num">数量</th>
          <th class="num">単価</th>
          <th class="num">金額</th>
        </tr>
      </thead>
      <tbody>${args.bodyRows}</tbody>
    </table>
  `
}

function renderItemsTableModern(args: RenderPartsArgs) {
  return `
    <table class="itemsTable itemsTable-modern">
      <thead>
        <tr>
          <th>内容</th>
          <th class="num">数量</th>
          <th class="num">単価</th>
          <th class="num">金額</th>
        </tr>
      </thead>
      <tbody>${args.bodyRows}</tbody>
    </table>
  `
}

function renderItemsTableElegant(args: RenderPartsArgs) {
  return `
    <table class="itemsTable itemsTable-elegant">
      <thead>
        <tr>
          <th>内容</th>
          <th class="num">数量</th>
          <th class="num">単価</th>
          <th class="num">金額</th>
        </tr>
      </thead>
      <tbody>${args.bodyRows}</tbody>
    </table>
  `
}

function renderItemsTableCorporate(args: RenderPartsArgs) {
  return `
    <table class="itemsTable itemsTable-corporate">
      <thead>
        <tr>
          <th>内容</th>
          <th class="num">数量</th>
          <th class="num">単価</th>
          <th class="num">金額</th>
        </tr>
      </thead>
      <tbody>${args.bodyRows}</tbody>
    </table>
  `
}

function renderItemsTable(args: RenderPartsArgs) {
  switch (args.templateKey) {
    case 'minimal':
      return renderItemsTableMinimal(args)
    case 'modern':
      return renderItemsTableModern(args)
    case 'elegant':
      return renderItemsTableElegant(args)
    case 'corporate':
      return renderItemsTableCorporate(args)
    case 'classic':
    default:
      return renderItemsTableClassic(args)
  }
}

/* =========================
 * Totals partials
 * ========================= */

function renderTotalsClassic(args: RenderPartsArgs) {
  const { totals, moneySuffix } = args
  return `
    <div class="sum sum-classic">
      <table>
        <tr>
          <th class="sumLabel">小計</th>
          <td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr>
          <th class="sumLabel">消費税</th>
          <td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr class="totalRow">
          <th class="sumLabel">合計</th>
          <td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td>
        </tr>
      </table>
    </div>
  `
}

function renderTotalsMinimal(args: RenderPartsArgs) {
  const { totals, moneySuffix } = args
  return `
    <div class="sum sum-minimal">
      <table>
        <tr>
          <th class="sumLabel">小計</th>
          <td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr>
          <th class="sumLabel">消費税</th>
          <td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr class="totalRow">
          <th class="sumLabel">合計</th>
          <td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td>
        </tr>
      </table>
    </div>
  `
}

function renderTotalsModern(args: RenderPartsArgs) {
  const { totals, moneySuffix } = args
  return `
    <div class="sum sum-modern">
      <table class="totalsCard totalsCard-modern">
        <tr>
          <th class="sumLabel">小計</th>
          <td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr>
          <th class="sumLabel">消費税</th>
          <td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr class="totalRow">
          <th class="sumLabel">合計</th>
          <td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td>
        </tr>
      </table>
    </div>
  `
}

function renderTotalsElegant(args: RenderPartsArgs) {
  const { totals, moneySuffix } = args
  return `
    <div class="sum sum-elegant">
      <table>
        <tr>
          <th class="sumLabel">小計</th>
          <td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr>
          <th class="sumLabel">消費税</th>
          <td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr class="totalRow">
          <th class="sumLabel">合計</th>
          <td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td>
        </tr>
      </table>
    </div>
  `
}

function renderTotalsCorporate(args: RenderPartsArgs) {
  const { totals, moneySuffix } = args
  return `
    <div class="sum sum-corporate">
      <table class="totalsCard totalsCard-corporate">
        <tr>
          <th class="sumLabel">小計</th>
          <td class="num">${totals.subtotal.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr>
          <th class="sumLabel">消費税</th>
          <td class="num">${totals.tax.toLocaleString()} ${moneySuffix}</td>
        </tr>
        <tr class="totalRow">
          <th class="sumLabel">合計</th>
          <td class="num"><b>${totals.total.toLocaleString()} ${moneySuffix}</b></td>
        </tr>
      </table>
    </div>
  `
}

function renderTotals(args: RenderPartsArgs) {
  switch (args.templateKey) {
    case 'minimal':
      return renderTotalsMinimal(args)
    case 'modern':
      return renderTotalsModern(args)
    case 'elegant':
      return renderTotalsElegant(args)
    case 'corporate':
      return renderTotalsCorporate(args)
    case 'classic':
    default:
      return renderTotalsClassic(args)
  }
}

/* =========================
 * Notes partials
 * ========================= */

function renderNotesClassic(args: RenderPartsArgs) {
  return args.notesHtml ? `<div class="notesWrap">${args.notesHtml}</div>` : ''
}

function renderNotesMinimal(args: RenderPartsArgs) {
  return args.notesHtml ? `<div class="notesWrap">${args.notesHtml}</div>` : ''
}

function renderNotesModern(args: RenderPartsArgs) {
  return args.notesHtml ? `<div class="notesWrap notesWrap-modern">${args.notesHtml}</div>` : ''
}

function renderNotesElegant(args: RenderPartsArgs) {
  return args.notesHtml
    ? `<div class="notesWrap notesWrap-elegant">
         <div class="notesFrame notesFrame-elegant">
           ${args.notesHtml}
         </div>
       </div>`
    : ''
}

function renderNotesCorporate(args: RenderPartsArgs) {
  return args.notesHtml ? `<div class="notesWrap notesWrap-corporate">${args.notesHtml}</div>` : ''
}

function renderNotes(args: RenderPartsArgs) {
  switch (args.templateKey) {
    case 'minimal':
      return renderNotesMinimal(args)
    case 'modern':
      return renderNotesModern(args)
    case 'elegant':
      return renderNotesElegant(args)
    case 'corporate':
      return renderNotesCorporate(args)
    case 'classic':
    default:
      return renderNotesClassic(args)
  }
}

/* =========================
 * Footer partials
 * ========================= */

function renderFooterClassic(args: RenderPartsArgs) {
  return args.footerHtml || ''
}

function renderFooterMinimal(args: RenderPartsArgs) {
  return args.footerHtml || ''
}

function renderFooterModern(args: RenderPartsArgs) {
  return args.footerHtml || ''
}

function renderFooterElegant(args: RenderPartsArgs) {
  return args.footerHtml || ''
}

function renderFooterCorporate(args: RenderPartsArgs) {
  return args.footerHtml || ''
}

function renderFooter(args: RenderPartsArgs) {
  switch (args.templateKey) {
    case 'minimal':
      return renderFooterMinimal(args)
    case 'modern':
      return renderFooterModern(args)
    case 'elegant':
      return renderFooterElegant(args)
    case 'corporate':
      return renderFooterCorporate(args)
    case 'classic':
    default:
      return renderFooterClassic(args)
  }
}

function renderProfileInfoTable(rows: Array<{ label: string; value: string }>) {
  const visibleRows = rows.filter((r) => nonEmpty(r.value))
  if (!visibleRows.length) return ''

  return `
    <div class="profileBlock">
      <table class="profileTable">
        <tbody>
          ${visibleRows
            .map(
              (r) => `
                <tr>
                  <th>${escapeHtml(r.label)}</th>
                  <td>${escapeHtml(r.value)}</td>
                </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

function formatInteriorBillingType(value: unknown) {
  const s = String(value ?? '').trim()

  if (s === 'advance') return '前受金'
  if (s === 'partial') return '中間請求'
  if (s === 'final') return '最終請求'

  return s
}

function renderCreatorBlocks(args: RenderPartsArgs) {
  const meta = args.creatorMeta
  if (!meta) return ''

  const projectInfoRows = [
    { label: '案件名', value: nonEmpty(meta.projectName) },
    { label: '作業期間（開始）', value: nonEmpty(meta.workPeriodFrom) },
    { label: '作業期間（終了）', value: nonEmpty(meta.workPeriodTo) },
    { label: '納期', value: nonEmpty(meta.deliveryDueDate) || nonEmpty(meta.deliveryDate) },
    { label: '納品物', value: nonEmpty(meta.deliverablesSummary) },
  ]

  const conditionRows = [
    { label: '納品形式', value: nonEmpty(meta.deliveryFormat) },
    {
      label: '修正回数',
      value:
        meta.revisionRoundsIncluded == null ? '' : String(meta.revisionRoundsIncluded),
    },
    { label: '利用範囲', value: nonEmpty(meta.usageScopeNote) },
    { label: '権利の扱い', value: nonEmpty(meta.rightsTreatmentNote) },
    { label: '支払条件', value: nonEmpty(meta.paymentTermsNote) },
    { label: '支払方法', value: nonEmpty(meta.paymentMethodNote) },
    {
      label: '源泉徴収額',
      value:
        meta.withholdingTaxEnabled && meta.withholdingTaxAmount != null
          ? `${num(meta.withholdingTaxAmount).toLocaleString()} ${args.moneySuffix}`
          : '',
    },
  ]

  const projectInfoHtml = renderProfileInfoTable(projectInfoRows)
  const conditionHtml = renderProfileInfoTable(conditionRows)

  if (!projectInfoHtml && !conditionHtml) return ''

  return `
    <div class="profileSection">
      ${projectInfoHtml ? `<div class="profileSectionTitle">案件情報</div>${projectInfoHtml}` : ''}
      ${conditionHtml ? `<div class="profileSectionTitle">制作条件</div>${conditionHtml}` : ''}
    </div>
  `
}

function renderInteriorBlocks(args: RenderPartsArgs) {
  const meta = args.interiorMeta
  if (!meta) return ''

  const projectInfoRows = [
    { label: '工事名', value: nonEmpty(meta.projectName) },
    { label: '現場名', value: nonEmpty(meta.siteName) },
    { label: '工事場所', value: nonEmpty(meta.siteAddress) },
    { label: '工期（開始）', value: nonEmpty(meta.constructionPeriodFrom) },
    { label: '工期（終了）', value: nonEmpty(meta.constructionPeriodTo) },
    { label: '見積有効期限', value: nonEmpty(meta.estimateValidUntil) },
  ]

  const billingRows = [
  { label: '請求区分', value: formatInteriorBillingType(meta.billingType) },
  { label: '支払条件', value: nonEmpty(meta.paymentTermsNote) },
  { label: '含むもの', value: nonEmpty(meta.scopeIncludedNote) },
  { label: '含まないもの', value: nonEmpty(meta.scopeExcludedNote) },
  {
    label: '前回まで請求額',
    value:
      meta.previousBilledAmount == null
        ? ''
        : `${num(meta.previousBilledAmount).toLocaleString()} ${args.moneySuffix}`,
  },
  {
    label: '今回請求額',
    value:
      meta.currentBilledAmount == null
        ? ''
        : `${num(meta.currentBilledAmount).toLocaleString()} ${args.moneySuffix}`,
  },
  {
    label: '残額',
    value:
      meta.remainingAmount == null
        ? ''
        : `${num(meta.remainingAmount).toLocaleString()} ${args.moneySuffix}`,
  },
]

  const projectInfoHtml = renderProfileInfoTable(projectInfoRows)
  const billingHtml = renderProfileInfoTable(billingRows)

  if (!projectInfoHtml && !billingHtml) return ''

  return `
    <div class="profileSection">
      ${projectInfoHtml ? `<div class="profileSectionTitle">工事情報</div>${projectInfoHtml}` : ''}
      ${billingHtml ? `<div class="profileSectionTitle">請求・条件情報</div>${billingHtml}` : ''}
    </div>
  `
}

function renderProfileBlocks(args: RenderPartsArgs) {
  if (args.templateProfile === 'creator') {
    return renderCreatorBlocks(args)
  }

  if (args.templateProfile === 'interior') {
    return renderInteriorBlocks(args)
  }

  return ''
}

function renderDocumentBody(args: RenderPartsArgs) {
  return `
    <div class="page">
      ${renderHeader(args)}
      ${renderProfileBlocks(args)}
      ${renderItemsTable(args)}
      ${renderTotals(args)}
      ${renderNotes(args)}
      ${renderFooter(args)}
    </div>
  `
}

export function buildInvoiceHtml(args: BuildInvoiceHtmlArgs) {
    const {
    title = '請求書',
    docType,
    documentNo,
    issuedAt,
    dueDate,
    notes,
    customerName,
    customerHonorific,
    currency,
    rows,
    totals,
    branding,
    templateProfile = 'standard',
    creatorMeta,
    interiorMeta,
    customer,
    issuer,
    fontCss = '',
  } = args

  const { docTypeLabel, docNoLabel, dateLabel } = detectDocType({ docType, title })

  const normalizedTitle = nonEmpty(title)
  const safeTitle = escapeHtml(docTypeLabel)
  const safeCustomTitle = normalizedTitle ? escapeHtml(normalizedTitle) : ''
  const safeNo = escapeHtml(documentNo || '-')
  const safeIssued = escapeHtml(issuedAt || '-')
  const safeDueDate = escapeHtml(dueDate || '-')
  const safeDateLabel = escapeHtml(dateLabel)
  const safeCurrency = escapeHtml(currency)
  const moneySuffix = currency === 'JPY' ? '円' : safeCurrency
  const brand = escapeHtml(branding.brandColor || '#111827')
  const templateKey = branding.templateKey || 'classic'

  const honorific = nonEmpty(customerHonorific)
  const customerBaseName = nonEmpty(customerName) || '—'
  const customerDisplayName = `${customerBaseName}${honorific ? ` ${honorific}` : ''}`

  const customerLines = joinLines([
    customer?.postalCode ? `〒${customer.postalCode}` : '',
    customer?.address1,
    customer?.address2,
    customer?.email ? `メール: ${customer.email}` : '',
    customer?.phone ? `電話: ${customer.phone}` : '',
  ])

  const issuerName = nonEmpty(issuer?.name) || '—'
  const issuerLines = joinLines([
    issuer?.postalCode ? `〒${issuer.postalCode}` : '',
    issuer?.address1,
    issuer?.address2,
    issuer?.email ? `メール: ${issuer.email}` : '',
    issuer?.phone ? `TEL: ${issuer.phone}` : '',
    issuer?.fax ? `FAX: ${issuer.fax}` : '',
  ])

  const notesHtml = nonEmpty(notes)
    ? `<section class="noteSection">
         <div class="noteHeader">備考</div>
         <div class="noteBody">${escapeHtml(String(notes ?? ''))}</div>
       </section>`
    : ''

  const logoHtml = branding.logoDataUri
    ? `<div class="logoWrap"><img class="logo" src="${branding.logoDataUri}" /></div>`
    : ''

  const footerHtml = branding.footerText
    ? `<div class="footer">${escapeHtml(branding.footerText)}</div>`
    : ''

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

  const chosenCss = [
    getBaseCss(fontCss, brand),
    getLayoutCss(),
    getPartialCss(),
    getTemplateCss(templateKey),
  ].join('\n')

    const htmlBody = renderDocumentBody({
    templateKey,
    templateProfile,
    safeTitle,
    safeCustomTitle,
    customerDisplayName,
    customerLines,
    docNoLabel,
    safeNo,
    safeIssued,
    safeDateLabel,
    safeDueDate,
    logoHtml,
    issuerName,
    issuerLines,
    bodyRows,
    totals,
    moneySuffix,
    notesHtml,
    footerHtml,
    creatorMeta,
    interiorMeta,
  })

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <style>${chosenCss}</style>
</head>
<body class="template-${escapeHtml(templateKey)}">
  ${htmlBody}
</body>
</html>`
}