'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

type Customer = { id: string; name: string }
type CustomerHonorific = '' | '御中' | '様'
type TemplateProfile = 'standard' | 'creator' | 'interior'
type InteriorBillingType = '' | 'advance' | 'partial' | 'final'

export type DocumentMetaDraft = {
  customer_id?: string | null
  customer_name?: string | null
  customer_honorific?: '御中' | '様' | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
  template_profile?: TemplateProfile | null
  extended_meta?: Record<string, unknown> | null
}

type NormalizedMetaDraft = {
  customer_id: string
  customer_name: string
  customer_honorific: CustomerHonorific
  title: string
  notes: string
  due_date: string
  template_profile: TemplateProfile
  extended_meta: Record<string, unknown>
}

function getDueDateLabel(docType?: string | null) {
  const v = String(docType ?? '').toLowerCase()
  return v === 'quote' || v === 'quotation' ? '有効期限' : '支払期日'
}

function getTitlePlaceholder(docType?: string | null) {
  const v = String(docType ?? '').toLowerCase()
  return v === 'quote' || v === 'quotation'
    ? '例）Webサイト制作お見積書'
    : '例）2026年3月分 ご請求書'
}

function toHonorific(value: string | null | undefined): CustomerHonorific {
  return value === '御中' || value === '様' ? value : ''
}

function toTemplateProfile(value: unknown): TemplateProfile {
  return value === 'creator' || value === 'interior' || value === 'standard'
    ? value
    : 'standard'
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep)
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}

    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortDeep(obj[key])
    }

    return sorted
  }

  return value
}

function stableJson(value: unknown) {
  return JSON.stringify(sortDeep(value))
}

function getStringMeta(
  meta: Record<string, unknown>,
  key: string,
  fallback = ''
) {
  const v = meta[key]
  return typeof v === 'string' ? v : fallback
}

function getNumberMeta(
  meta: Record<string, unknown>,
  key: string,
  fallback: number | '' = ''
): number | '' {
  const v = meta[key]
  if (v == null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toBillingType(value: unknown): InteriorBillingType {
  return value === 'advance' || value === 'partial' || value === 'final'
    ? value
    : ''
}

function buildCreatorMeta(params: {
  projectName: string
  deliveryDueDate: string
  deliverablesSummary: string
  revisionRoundsIncluded: number | ''
  usageScopeNote: string
  rightsTreatmentNote: string
}) {
  const out: Record<string, unknown> = {}

  if (params.projectName) out.project_name = params.projectName
  if (params.deliveryDueDate) out.delivery_due_date = params.deliveryDueDate
  if (params.deliverablesSummary) out.deliverables_summary = params.deliverablesSummary
  if (params.revisionRoundsIncluded !== '') {
    out.revision_rounds_included = Number(params.revisionRoundsIncluded)
  }
  if (params.usageScopeNote) out.usage_scope_note = params.usageScopeNote
  if (params.rightsTreatmentNote) out.rights_treatment_note = params.rightsTreatmentNote

  return out
}

function buildInteriorMeta(params: {
  projectName: string
  siteName: string
  constructionPeriodFrom: string
  constructionPeriodTo: string
  billingType: InteriorBillingType
  previousBilledAmount: number | ''
  currentBilledAmount: number | ''
  remainingAmount: number | ''
}) {
  const out: Record<string, unknown> = {}

  if (params.projectName) out.project_name = params.projectName
  if (params.siteName) out.site_name = params.siteName
  if (params.constructionPeriodFrom) {
    out.construction_period_from = params.constructionPeriodFrom
  }
  if (params.constructionPeriodTo) {
    out.construction_period_to = params.constructionPeriodTo
  }
  if (params.billingType) out.billing_type = params.billingType
  if (params.previousBilledAmount !== '') {
    out.previous_billed_amount = Number(params.previousBilledAmount)
  }
  if (params.currentBilledAmount !== '') {
    out.current_billed_amount = Number(params.currentBilledAmount)
  }
  if (params.remainingAmount !== '') {
    out.remaining_amount = Number(params.remainingAmount)
  }

  return out
}

function toComparableExtendedMeta(
  templateProfile: TemplateProfile,
  meta: Record<string, unknown>
): Record<string, unknown> {
  if (templateProfile === 'creator') {
    return buildCreatorMeta({
      projectName: getStringMeta(meta, 'project_name'),
      deliveryDueDate: getStringMeta(meta, 'delivery_due_date'),
      deliverablesSummary: getStringMeta(meta, 'deliverables_summary'),
      revisionRoundsIncluded: getNumberMeta(meta, 'revision_rounds_included'),
      usageScopeNote: getStringMeta(meta, 'usage_scope_note'),
      rightsTreatmentNote: getStringMeta(meta, 'rights_treatment_note'),
    })
  }

  if (templateProfile === 'interior') {
    return buildInteriorMeta({
      projectName: getStringMeta(meta, 'project_name'),
      siteName: getStringMeta(meta, 'site_name'),
      constructionPeriodFrom: getStringMeta(meta, 'construction_period_from'),
      constructionPeriodTo: getStringMeta(meta, 'construction_period_to'),
      billingType: toBillingType(meta.billing_type),
      previousBilledAmount: getNumberMeta(meta, 'previous_billed_amount'),
      currentBilledAmount: getNumberMeta(meta, 'current_billed_amount'),
      remainingAmount: getNumberMeta(meta, 'remaining_amount'),
    })
  }

  return {}
}

export function DocumentMetaForm({
  documentId,
  initial,
  customers,
  onDraftChange,
  docType,
}: {
  documentId: string
  initial: DocumentMetaDraft
  customers: Customer[]
  onDraftChange?: (draft: DocumentMetaDraft) => void
  docType?: string | null
}) {

  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:meta_dirty`, [documentId])
  const dueDateLabel = getDueDateLabel(docType)
  const titlePlaceholder = getTitlePlaceholder(docType)

  const normalize = (v: DocumentMetaDraft): NormalizedMetaDraft => ({
    customer_id: String(v.customer_id ?? ''),
    customer_name: String(v.customer_name ?? ''),
    customer_honorific: toHonorific(v.customer_honorific),
    title: String(v.title ?? ''),
    notes: String(v.notes ?? ''),
    due_date: String(v.due_date ?? ''),
    template_profile: toTemplateProfile(v.template_profile),
    extended_meta: toObject(v.extended_meta),
  })

  const initialTemplateProfile = useMemo(
    () => toTemplateProfile(initial.template_profile),
    [initial.template_profile]
  )

  const initialExtendedMeta = useMemo(
    () => toObject(initial.extended_meta),
    [initial.extended_meta]
  )

const [persistedTemplateProfile, setPersistedTemplateProfile] = useState<TemplateProfile>(
  initialTemplateProfile
)
const [persistedExtendedMeta, setPersistedExtendedMeta] = useState<Record<string, unknown>>(
  initialExtendedMeta
)

  const initialNormalized = useMemo(
  () =>
    normalize({
      customer_id: initial.customer_id ?? '',
      customer_name: initial.customer_name ?? '',
      customer_honorific: initial.customer_honorific ?? null,
      title: initial.title ?? '',
      notes: initial.notes ?? '',
      due_date: initial.due_date ?? '',
      template_profile: initialTemplateProfile,
      extended_meta: toComparableExtendedMeta(
        initialTemplateProfile,
        initialExtendedMeta
      ),
    }),
  [
    initial.customer_id,
    initial.customer_name,
    initial.customer_honorific,
    initial.title,
    initial.notes,
    initial.due_date,
    initialTemplateProfile,
    initialExtendedMeta,
  ]
)

   const initialBaseState = useMemo(
    () => stableJson(initialNormalized),
    [initialNormalized]
  )

  const [customerId, setCustomerId] = useState<string>(initial.customer_id ?? '')
  const [customerName, setCustomerName] = useState<string>(initial.customer_name ?? '')
  const [customerHonorific, setCustomerHonorific] = useState<CustomerHonorific>(
    toHonorific(initial.customer_honorific)
  )
  const [title, setTitle] = useState<string>(initial.title ?? '')
  const [notes, setNotes] = useState<string>(initial.notes ?? '')
  const [dueDate, setDueDate] = useState<string>(initial.due_date ?? '')

  const [templateProfile, setTemplateProfile] = useState<TemplateProfile>(
    initialTemplateProfile
  )

  const [creatorProjectName, setCreatorProjectName] = useState<string>(
    getStringMeta(initialExtendedMeta, 'project_name')
  )
  const [creatorDeliveryDueDate, setCreatorDeliveryDueDate] = useState<string>(
    getStringMeta(initialExtendedMeta, 'delivery_due_date')
  )
  const [creatorDeliverablesSummary, setCreatorDeliverablesSummary] = useState<string>(
    getStringMeta(initialExtendedMeta, 'deliverables_summary')
  )
  const [creatorRevisionRoundsIncluded, setCreatorRevisionRoundsIncluded] = useState<
    number | ''
  >(getNumberMeta(initialExtendedMeta, 'revision_rounds_included'))
  const [creatorUsageScopeNote, setCreatorUsageScopeNote] = useState<string>(
    getStringMeta(initialExtendedMeta, 'usage_scope_note')
  )
  const [creatorRightsTreatmentNote, setCreatorRightsTreatmentNote] = useState<string>(
    getStringMeta(initialExtendedMeta, 'rights_treatment_note')
  )

  const [interiorProjectName, setInteriorProjectName] = useState<string>(
    getStringMeta(initialExtendedMeta, 'project_name')
  )
  const [siteName, setSiteName] = useState<string>(
    getStringMeta(initialExtendedMeta, 'site_name')
  )
  const [constructionPeriodFrom, setConstructionPeriodFrom] = useState<string>(
    getStringMeta(initialExtendedMeta, 'construction_period_from')
  )
  const [constructionPeriodTo, setConstructionPeriodTo] = useState<string>(
    getStringMeta(initialExtendedMeta, 'construction_period_to')
  )
  const [billingType, setBillingType] = useState<InteriorBillingType>(
    toBillingType(initialExtendedMeta.billing_type)
  )
  const [previousBilledAmount, setPreviousBilledAmount] = useState<number | ''>(
    getNumberMeta(initialExtendedMeta, 'previous_billed_amount')
  )
  const [currentBilledAmount, setCurrentBilledAmount] = useState<number | ''>(
    getNumberMeta(initialExtendedMeta, 'current_billed_amount')
  )
  const [remainingAmount, setRemainingAmount] = useState<number | ''>(
    getNumberMeta(initialExtendedMeta, 'remaining_amount')
  )

  const [customerList, setCustomerList] = useState<Customer[]>(customers ?? [])

  const [busy, setBusy] = useState(false)
  const [refreshingCustomers, setRefreshingCustomers] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [baseState, setBaseState] = useState(initialBaseState)

  const dirtyRef = useRef(false)
  const didMountRef = useRef(false)

  useEffect(() => {
    setCustomerList(customers ?? [])
  }, [customers])

  const customerOptions = useMemo(() => customerList ?? [], [customerList])

  const applyDraftToState = (draft: DocumentMetaDraft) => {
  const nextTemplateProfile = toTemplateProfile(draft.template_profile)
  const nextExtendedMeta = toObject(draft.extended_meta)

  setPersistedTemplateProfile(nextTemplateProfile)
  setPersistedExtendedMeta(nextExtendedMeta)

  setCustomerId(String(draft.customer_id ?? ''))
  setCustomerName(String(draft.customer_name ?? ''))
  setCustomerHonorific(toHonorific(draft.customer_honorific))
  setTitle(String(draft.title ?? ''))
  setNotes(String(draft.notes ?? ''))
  setDueDate(String(draft.due_date ?? ''))
  setTemplateProfile(nextTemplateProfile)

  setCreatorProjectName(getStringMeta(nextExtendedMeta, 'project_name'))
  setCreatorDeliveryDueDate(getStringMeta(nextExtendedMeta, 'delivery_due_date'))
  setCreatorDeliverablesSummary(getStringMeta(nextExtendedMeta, 'deliverables_summary'))
  setCreatorRevisionRoundsIncluded(
    getNumberMeta(nextExtendedMeta, 'revision_rounds_included')
  )
  setCreatorUsageScopeNote(getStringMeta(nextExtendedMeta, 'usage_scope_note'))
  setCreatorRightsTreatmentNote(
    getStringMeta(nextExtendedMeta, 'rights_treatment_note')
  )

  setInteriorProjectName(getStringMeta(nextExtendedMeta, 'project_name'))
  setSiteName(getStringMeta(nextExtendedMeta, 'site_name'))
  setConstructionPeriodFrom(getStringMeta(nextExtendedMeta, 'construction_period_from'))
  setConstructionPeriodTo(getStringMeta(nextExtendedMeta, 'construction_period_to'))
  setBillingType(toBillingType(nextExtendedMeta.billing_type))
  setPreviousBilledAmount(getNumberMeta(nextExtendedMeta, 'previous_billed_amount'))
  setCurrentBilledAmount(getNumberMeta(nextExtendedMeta, 'current_billed_amount'))
  setRemainingAmount(getNumberMeta(nextExtendedMeta, 'remaining_amount'))

  setBaseState(
    stableJson(
      normalize({
        customer_id: draft.customer_id ?? '',
        customer_name: draft.customer_name ?? '',
        customer_honorific: draft.customer_honorific ?? null,
        title: draft.title ?? '',
        notes: draft.notes ?? '',
        due_date: draft.due_date ?? '',
        template_profile: nextTemplateProfile,
        extended_meta: toComparableExtendedMeta(
          nextTemplateProfile,
          nextExtendedMeta
        ),
      })
    )
  )
}

const currentExtendedMeta = useMemo<Record<string, unknown>>(() => {
  if (templateProfile === 'creator') {
    const base =
      persistedTemplateProfile === 'creator' ? { ...persistedExtendedMeta } : {}

    return {
      ...base,
      ...buildCreatorMeta({
        projectName: creatorProjectName,
        deliveryDueDate: creatorDeliveryDueDate,
        deliverablesSummary: creatorDeliverablesSummary,
        revisionRoundsIncluded: creatorRevisionRoundsIncluded,
        usageScopeNote: creatorUsageScopeNote,
        rightsTreatmentNote: creatorRightsTreatmentNote,
      }),
    }
  }

  if (templateProfile === 'interior') {
    const base =
      persistedTemplateProfile === 'interior' ? { ...persistedExtendedMeta } : {}

    return {
      ...base,
      ...buildInteriorMeta({
        projectName: interiorProjectName,
        siteName,
        constructionPeriodFrom,
        constructionPeriodTo,
        billingType,
        previousBilledAmount,
        currentBilledAmount,
        remainingAmount,
      }),
    }
  }

  return {}
}, [
  templateProfile,
  persistedTemplateProfile,
  persistedExtendedMeta,
  creatorProjectName,
  creatorDeliveryDueDate,
  creatorDeliverablesSummary,
  creatorRevisionRoundsIncluded,
  creatorUsageScopeNote,
  creatorRightsTreatmentNote,
  interiorProjectName,
  siteName,
  constructionPeriodFrom,
  constructionPeriodTo,
  billingType,
  previousBilledAmount,
  currentBilledAmount,
  remainingAmount,
])

const currentDraft = useMemo<DocumentMetaDraft>(

    () => ({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_honorific:
        customerHonorific === '御中' || customerHonorific === '様'
          ? customerHonorific
          : null,
      title: title || null,
      notes: notes || null,
      due_date: dueDate || null,
      template_profile: templateProfile,
      extended_meta: currentExtendedMeta,
    }),
    [
      customerId,
      customerName,
      customerHonorific,
      title,
      notes,
      dueDate,
      templateProfile,
      currentExtendedMeta,
    ]
  )

  const currentNormalized = useMemo(
  () =>
    normalize({
      ...currentDraft,
      extended_meta: toComparableExtendedMeta(
        templateProfile,
        toObject(currentDraft.extended_meta)
      ),
    }),
  [currentDraft, templateProfile]
)

  useEffect(() => {
    onDraftChange?.(currentDraft)
  }, [currentDraft, onDraftChange])

  const dirty = useMemo(() => {
    return stableJson(currentNormalized) !== baseState
  }, [currentNormalized, baseState])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
  if (!didMountRef.current) {
    didMountRef.current = true
    return
  }

  if (dirtyRef.current) return

  applyDraftToState({
    customer_id: initial.customer_id ?? '',
    customer_name: initial.customer_name ?? '',
    customer_honorific: initial.customer_honorific ?? null,
    title: initial.title ?? '',
    notes: initial.notes ?? '',
    due_date: initial.due_date ?? '',
    template_profile: initial.template_profile ?? 'standard',
    extended_meta: initial.extended_meta ?? {},
  })

  setErr(null)
  setOk(null)

  try {
    localStorage.removeItem(DIRTY_KEY)
  } catch {}
}, [
  initial.customer_id,
  initial.customer_name,
  initial.customer_honorific,
  initial.title,
  initial.notes,
  initial.due_date,
  initial.template_profile,
  initial.extended_meta,
  DIRTY_KEY,
])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (dirty) {
      localStorage.setItem(DIRTY_KEY, '1')
    } else {
      localStorage.removeItem(DIRTY_KEY)
    }
  }, [dirty, DIRTY_KEY])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const handleCustomerChange = (nextId: string) => {
    setErr(null)
    setOk(null)
    setCustomerId(nextId)

    const found = customerOptions.find((c) => c.id === nextId)
    if (found) {
      setCustomerName(found.name)
    }
  }

  const refreshCustomers = async () => {
    setErr(null)
    setOk(null)
    setRefreshingCustomers(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.message ?? json.error ?? 'error'}`)
        return
      }

      const nextCustomers = Array.isArray(json?.customers) ? (json.customers as Customer[]) : []
      setCustomerList(nextCustomers)
      setOk('顧客一覧を更新しました')
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setRefreshingCustomers(false)
    }
  }

  const saveMeta = async (): Promise<boolean> => {
    setErr(null)
    setOk(null)
    setBusy(true)

    try {
      const payload: DocumentMetaDraft = {
        customer_id: customerId ? customerId : null,
        customer_name: customerName ? customerName : null,
        customer_honorific:
          customerHonorific === '御中' || customerHonorific === '様'
            ? customerHonorific
            : null,
        title: title ? title : null,
        notes: notes ? notes : null,
        due_date: dueDate ? dueDate : null,
        template_profile: templateProfile,
        extended_meta: currentExtendedMeta,
      }

      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'error'}`)
        return false
      }

      const saved = json?.document as DocumentMetaDraft | undefined

const nextDraft: DocumentMetaDraft = {
  customer_id: saved?.customer_id ?? payload.customer_id ?? null,
  customer_name: saved?.customer_name ?? payload.customer_name ?? null,
  customer_honorific:
    saved?.customer_honorific === '御中' || saved?.customer_honorific === '様'
      ? saved.customer_honorific
      : payload.customer_honorific ?? null,
  title: saved?.title ?? payload.title ?? null,
  notes: saved?.notes ?? payload.notes ?? null,
  due_date: saved?.due_date ?? payload.due_date ?? null,

  // ここは payload を優先して UI を巻き戻さない
  template_profile: toTemplateProfile(
    payload.template_profile ?? saved?.template_profile ?? 'standard'
  ),
  extended_meta: toObject(payload.extended_meta ?? saved?.extended_meta),
}

applyDraftToState(nextDraft)

setOk('書類情報を保存しました')

try {
  localStorage.removeItem(DIRTY_KEY)
} catch {}

return true
    } catch (e: any) {
      setErr(e?.message ?? String(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={rootCard}>
      <div style={sectionCardEmphasis}>
        <div style={sectionTitle}>基本項目</div>
        <div style={sectionDescription}>
          まずは請求先、帳票タイトル、{dueDateLabel}を設定します。
        </div>

        <div style={fieldGrid}>
          <label style={fieldWrap}>
            <span style={labelText}>帳票タイプ</span>
            <select
              value={templateProfile}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setTemplateProfile(toTemplateProfile(e.target.value))
              }}
              style={input}
              disabled={busy}
            >
              <option value="standard">標準</option>
              <option value="creator">フリーランス制作者向け</option>
              <option value="interior">内装・小規模工事向け</option>
            </select>
            <div style={helpText}>
              帳票タイプに応じて、追加の入力項目とPDF表示内容が切り替わります。
            </div>
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>顧客マスタから選択</span>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              style={input}
              disabled={busy || refreshingCustomers}
            >
              <option value="">（未選択）</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div style={helpText}>
              顧客を選ぶと、下の「書類に表示する請求先名」に自動入力されます。必要に応じて書類ごとに上書きできます。
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                href="/customers/new"
                target="_blank"
                rel="noopener noreferrer"
                style={subActionBtn}
              >
                顧客を新規作成
              </Link>

              <button
                type="button"
                onClick={refreshCustomers}
                disabled={busy || refreshingCustomers}
                style={subActionButton}
              >
                {refreshingCustomers ? '顧客一覧を更新中…' : '顧客一覧を更新'}
              </button>
            </div>
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>書類に表示する請求先名</span>
            <input
              value={customerName}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setCustomerName(e.target.value)
              }}
              style={input}
              disabled={busy}
              placeholder="株式会社テスト"
            />
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>請求先敬称</span>
            <select
              value={customerHonorific}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setCustomerHonorific(toHonorific(e.target.value))
              }}
              style={input}
              disabled={busy}
            >
              <option value="">なし</option>
              <option value="御中">御中</option>
              <option value="様">様</option>
            </select>

            <div style={helpText}>
              法人宛ては「御中」、個人宛ては「様」を選ぶ想定です。
            </div>
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>帳票タイトル</span>
            <input
              value={title}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setTitle(e.target.value)
              }}
              style={input}
              disabled={busy}
              placeholder={titlePlaceholder}
            />
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>{dueDateLabel}</span>
            <input
              type="date"
              value={dueDate ?? ''}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setDueDate(e.target.value)
              }}
              style={input}
              disabled={busy}
            />
          </label>
        </div>
      </div>

      {templateProfile === 'creator' && (
        <div style={sectionCard}>
          <div style={sectionTitle}>フリーランス制作者向け項目</div>
          <div style={sectionDescription}>
            案件情報や制作条件に関わる項目を入力します。
          </div>

          <div style={fieldGrid}>
            <label style={fieldWrap}>
              <span style={labelText}>案件名</span>
              <input
                value={creatorProjectName}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setCreatorProjectName(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）LP制作"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>納期</span>
              <input
                type="date"
                value={creatorDeliveryDueDate}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setCreatorDeliveryDueDate(e.target.value)
                }}
                style={input}
                disabled={busy}
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>納品物</span>
              <input
                value={creatorDeliverablesSummary}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setCreatorDeliverablesSummary(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）バナー3点"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>修正回数</span>
              <input
                type="number"
                min={0}
                value={creatorRevisionRoundsIncluded}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  const raw = e.target.value
                  setCreatorRevisionRoundsIncluded(raw === '' ? '' : Number(raw))
                }}
                style={input}
                disabled={busy}
                placeholder="例）2"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>利用範囲</span>
              <input
                value={creatorUsageScopeNote}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setCreatorUsageScopeNote(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）Web掲載用"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>権利の扱い</span>
              <input
                value={creatorRightsTreatmentNote}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setCreatorRightsTreatmentNote(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）上記利用範囲で利用許諾"
              />
            </label>
          </div>
        </div>
      )}

      {templateProfile === 'interior' && (
        <div style={sectionCard}>
          <div style={sectionTitle}>内装・小規模工事向け項目</div>
          <div style={sectionDescription}>
            工事案件や請求進捗に関わる項目を入力します。
          </div>

          <div style={fieldGrid}>
            <label style={fieldWrap}>
              <span style={labelText}>工事名</span>
              <input
                value={interiorProjectName}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setInteriorProjectName(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）店舗内装工事"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>現場名</span>
              <input
                value={siteName}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setSiteName(e.target.value)
                }}
                style={input}
                disabled={busy}
                placeholder="例）○○店舗"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>工期開始日</span>
              <input
                type="date"
                value={constructionPeriodFrom}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setConstructionPeriodFrom(e.target.value)
                }}
                style={input}
                disabled={busy}
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>工期終了日</span>
              <input
                type="date"
                value={constructionPeriodTo}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setConstructionPeriodTo(e.target.value)
                }}
                style={input}
                disabled={busy}
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>請求区分</span>
              <select
                value={billingType}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  setBillingType(toBillingType(e.target.value))
                }}
                style={input}
                disabled={busy}
              >
                <option value="">（未選択）</option>
                <option value="advance">前受金</option>
                <option value="partial">中間請求</option>
                <option value="final">最終請求</option>
              </select>
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>前回まで請求額</span>
              <input
                type="number"
                min={0}
                value={previousBilledAmount}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  const raw = e.target.value
                  setPreviousBilledAmount(raw === '' ? '' : Number(raw))
                }}
                style={input}
                disabled={busy}
                placeholder="例）50000"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>今回請求額</span>
              <input
                type="number"
                min={0}
                value={currentBilledAmount}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  const raw = e.target.value
                  setCurrentBilledAmount(raw === '' ? '' : Number(raw))
                }}
                style={input}
                disabled={busy}
                placeholder="例）150000"
              />
            </label>

            <label style={fieldWrap}>
              <span style={labelText}>残額</span>
              <input
                type="number"
                min={0}
                value={remainingAmount}
                onChange={(e) => {
                  setErr(null)
                  setOk(null)
                  const raw = e.target.value
                  setRemainingAmount(raw === '' ? '' : Number(raw))
                }}
                style={input}
                disabled={busy}
                placeholder="例）0"
              />
            </label>
          </div>
        </div>
      )}

      <div style={sectionCard}>
        <div style={sectionTitle}>補足情報</div>
        <div style={sectionDescription}>
          必要に応じて備考を入力します。PDF下部にも反映されます。
        </div>

        <label style={fieldWrap}>
          <span style={labelText}>備考</span>
          <textarea
            value={notes}
            onChange={(e) => {
              setErr(null)
              setOk(null)
              setNotes(e.target.value)
            }}
            style={{ ...input, minHeight: 100, resize: 'vertical' }}
            disabled={busy}
            placeholder="振込先や補足事項など"
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={saveMeta} disabled={busy} style={btn}>
          {busy ? '保存中…' : '書類情報を保存'}
        </button>

        {dirty && !busy && (
          <span
            style={{
              color: '#b45309',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            未保存の変更があります
          </span>
        )}
      </div>

      {err && <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>}
      {ok && <p style={{ color: 'green', margin: 0 }}>{ok}</p>}
    </div>
  )
}

const rootCard: React.CSSProperties = {
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
}

const sectionCardEmphasis: React.CSSProperties = {
  padding: 16,
  border: '1px solid #dbeafe',
  borderRadius: 12,
  background: '#f8fbff',
  display: 'grid',
  gap: 14,
}

const sectionCard: React.CSSProperties = {
  marginTop: 14,
  padding: 16,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  display: 'grid',
  gap: 14,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#111827',
}

const sectionDescription: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: 1.6,
}

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gap: 14,
}

const fieldWrap: React.CSSProperties = {
  display: 'grid',
  gap: 6,
}

const labelText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const helpText: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  lineHeight: 1.6,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  display: 'block',
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
  fontSize: 14,
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #ccc',
  borderRadius: 10,
  background: '#fff',
  fontSize: 14,
  fontWeight: 600,
}

const subActionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
}

const subActionButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}