import { calcTotals } from '@/lib/calc'
import type { Branding } from './branding'

type TemplateProfile = 'standard' | 'creator' | 'interior'

function num(v: any) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function numOrNull(v: any) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function nonEmptyString(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : ''
}

function normalizeTemplateProfile(v: any): TemplateProfile {
  const s = String(v ?? '').trim()
  if (s === 'creator' || s === 'interior' || s === 'standard') return s
  return 'standard'
}

function toObject(v: any): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

export type InvoiceViewModelInput = {
  doc: {
    id?: string | null
    doc_type?: string | null
    customer_name?: string | null
    customer_honorific?: string | null
    currency?: string | null
    document_no?: string | null
    issued_at?: string | null
    title?: string | null
    notes?: string | null
    due_date?: string | null
    template_profile?: TemplateProfile | string | null
    extended_meta?: Record<string, unknown> | null
  }
  customer?: {
    name?: string | null
    postal_code?: string | null
    address1?: string | null
    address2?: string | null
    email?: string | null
    phone?: string | null
  } | null
  items: Array<{
    description?: string | null
    quantity?: number | string | null
    unit_price_amount?: number | string | null
    line_subtotal_amount?: number | string | null
  }>
  branding: Branding
}

export function buildInvoiceViewModel(args: InvoiceViewModelInput) {
  const { doc, customer, items, branding } = args

  const rows = (items ?? []).map((it) => {
    const qty = num(it.quantity)
    const unit = num(it.unit_price_amount)
    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)

    return {
      description: it.description ?? '',
      qty,
      unit,
      line,
    }
  })

  const subtotal = rows.reduce((sum, r) => sum + num(r.line), 0)
  const currency = String(doc?.currency ?? 'JPY')
  const totals = calcTotals(subtotal, currency)

  const displayTitle = nonEmptyString(doc?.title)

  const customerName =
    nonEmptyString(doc?.customer_name) ||
    nonEmptyString(customer?.name)

  const templateProfile = normalizeTemplateProfile(doc?.template_profile)
  const extendedMeta = toObject(doc?.extended_meta)

  const creatorMeta = {
    projectName: nonEmptyString(extendedMeta.project_name),
    workPeriodFrom: nonEmptyString(extendedMeta.work_period_from),
    workPeriodTo: nonEmptyString(extendedMeta.work_period_to),
    deliveryDueDate: nonEmptyString(extendedMeta.delivery_due_date),
    deliveryDate: nonEmptyString(extendedMeta.delivery_date),
    deliverablesSummary: nonEmptyString(extendedMeta.deliverables_summary),
    deliveryFormat: nonEmptyString(extendedMeta.delivery_format),
    revisionRoundsIncluded: numOrNull(extendedMeta.revision_rounds_included),
    usageScopeNote: nonEmptyString(extendedMeta.usage_scope_note),
    rightsTreatmentNote: nonEmptyString(extendedMeta.rights_treatment_note),
    paymentTermsNote: nonEmptyString(extendedMeta.payment_terms_note),
    paymentMethodNote: nonEmptyString(extendedMeta.payment_method_note),
    withholdingTaxEnabled: Boolean(extendedMeta.withholding_tax_enabled),
    withholdingTaxAmount: numOrNull(extendedMeta.withholding_tax_amount),
  }

  const interiorMeta = {
    projectName: nonEmptyString(extendedMeta.project_name),
    siteName: nonEmptyString(extendedMeta.site_name),
    siteAddress: nonEmptyString(extendedMeta.site_address),
    constructionPeriodFrom: nonEmptyString(extendedMeta.construction_period_from),
    constructionPeriodTo: nonEmptyString(extendedMeta.construction_period_to),
    estimateValidUntil: nonEmptyString(extendedMeta.estimate_valid_until),
    billingType: nonEmptyString(extendedMeta.billing_type),
    paymentTermsNote: nonEmptyString(extendedMeta.payment_terms_note),
    scopeIncludedNote: nonEmptyString(extendedMeta.scope_included_note),
    scopeExcludedNote: nonEmptyString(extendedMeta.scope_excluded_note),
    previousBilledAmount: numOrNull(extendedMeta.previous_billed_amount),
    currentBilledAmount: numOrNull(extendedMeta.current_billed_amount),
    remainingAmount: numOrNull(extendedMeta.remaining_amount),
  }

  return {
    title: displayTitle,
    docType: String(doc?.doc_type ?? ''),
    documentNo: String(doc?.document_no ?? doc?.id ?? ''),
    issuedAt: String(doc?.issued_at ?? ''),
    dueDate: String(doc?.due_date ?? ''),
    notes: String(doc?.notes ?? ''),
    customerName,
    customerHonorific: nonEmptyString(doc?.customer_honorific),
    currency,
    rows,
    totals,
    branding,
    templateProfile,
    extendedMeta,
    creatorMeta,
    interiorMeta,
    customer: {
      postalCode: nonEmptyString(customer?.postal_code),
      address1: nonEmptyString(customer?.address1),
      address2: nonEmptyString(customer?.address2),
      email: nonEmptyString(customer?.email),
      phone: nonEmptyString(customer?.phone),
    },
    issuer: {
      name: nonEmptyString((branding as any)?.issuerName),
      postalCode: nonEmptyString((branding as any)?.issuerPostalCode),
      address1: nonEmptyString((branding as any)?.issuerAddress1),
      address2: nonEmptyString((branding as any)?.issuerAddress2),
      email: nonEmptyString((branding as any)?.issuerEmail),
      phone: nonEmptyString((branding as any)?.issuerPhone),
      fax: nonEmptyString((branding as any)?.issuerFax),
    },
  }
}