'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Kind = 'branding' | 'customers' | 'document'
type PlanKey = 'free' | 'starter' | 'standard'

type Props = {
  kind: Kind
}

type Summary = {
  planKey: PlanKey
  issuedCount: number
  savedPdfCount: number
  customerCount: number
  issuedRemaining: number | null
  customerRemaining: number | null
  pdfHistoryRemaining: number | null
  canUseBranding: boolean
}

type ViewModel = {
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  title: string
  body: string
  meta?: string
  ctaLabel?: string
  ctaHref?: string
}

const PLAN_LIMITS = {
  free: {
    issued: 5,
    customers: 10,
    pdfHistory: 5,
    branding: false,
  },
  starter: {
    issued: 30,
    customers: null,
    pdfHistory: 100,
    branding: true,
  },
  standard: {
    issued: null,
    customers: null,
    pdfHistory: null,
    branding: true,
  },
} as const

function toNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toNullableNumber(v: unknown) {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toBoolean(v: unknown, fallback = false) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    if (s === 'true') return true
    if (s === 'false') return false
  }
  return fallback
}

function toPlanKey(v: unknown): PlanKey {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'starter') return 'starter'
  if (s === 'standard') return 'standard'
  return 'free'
}

function pickFirst(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined) return obj[key]
  }
  return undefined
}

function normalizeSummary(raw: any): Summary {
  const planKey = toPlanKey(
    pickFirst(raw, ['planKey', 'plan_key', 'currentPlan', 'current_plan'])
  )

  const issuedCount = toNumber(
    pickFirst(raw, ['issuedCount', 'issued_count'])
  )

  const savedPdfCount = toNumber(
    pickFirst(raw, ['savedPdfCount', 'saved_pdf_count'])
  )

  const customerCount = toNumber(
    pickFirst(raw, ['customerCount', 'customer_count'])
  )

  let issuedRemaining = toNullableNumber(
    pickFirst(raw, ['issuedRemaining', 'issued_remaining', 'issueRemaining', 'issue_remaining'])
  )

  let customerRemaining = toNullableNumber(
    pickFirst(raw, ['customerRemaining', 'customer_remaining'])
  )

  let pdfHistoryRemaining = toNullableNumber(
    pickFirst(raw, ['pdfHistoryRemaining', 'pdf_history_remaining', 'savedPdfRemaining', 'saved_pdf_remaining'])
  )

  let canUseBranding = toBoolean(
    pickFirst(raw, ['canUseBranding', 'can_use_branding', 'brandingEnabled', 'branding_enabled']),
    PLAN_LIMITS[planKey].branding
  )

  const limits = PLAN_LIMITS[planKey]

  if (issuedRemaining == null && limits.issued != null) {
    issuedRemaining = Math.max(0, limits.issued - issuedCount)
  }

  if (customerRemaining == null && limits.customers != null) {
    customerRemaining = Math.max(0, limits.customers - customerCount)
  }

  if (pdfHistoryRemaining == null && limits.pdfHistory != null) {
    pdfHistoryRemaining = Math.max(0, limits.pdfHistory - savedPdfCount)
  }

  if (pickFirst(raw, ['canUseBranding', 'can_use_branding', 'brandingEnabled', 'branding_enabled']) == null) {
    canUseBranding = limits.branding
  }

  return {
    planKey,
    issuedCount,
    savedPdfCount,
    customerCount,
    issuedRemaining,
    customerRemaining,
    pdfHistoryRemaining,
    canUseBranding,
  }
}

function planLabel(planKey: PlanKey) {
  if (planKey === 'starter') return 'Starter'
  if (planKey === 'standard') return 'Standard'
  return 'Free'
}

function buildViewModel(kind: Kind, s: Summary): ViewModel {
  const planName = planLabel(s.planKey)

  if (kind === 'branding') {
    if (!s.canUseBranding) {
      return {
        tone: 'danger',
        title: 'ブランド設定はStarter以上で利用できます',
        body:
          '現在のFreeプランでは、ブランドカラーやロゴ設定は利用できません。請求書・見積書の見た目を整えたい場合はアップグレードをご検討ください。',
        meta: `現在のプラン: ${planName}`,
        ctaLabel: 'アップグレードを相談する',
        ctaHref: '/contact',
      }
    }

    return {
      tone: 'success',
      title: 'このプランではブランド設定を利用できます',
      body: 'ロゴ・ブランドカラーの設定が可能です。',
      meta: `現在のプラン: ${planName}`,
    }
  }

  if (kind === 'customers') {
    if (s.planKey === 'free') {
      if ((s.customerRemaining ?? 0) <= 0) {
        return {
          tone: 'danger',
          title: '顧客登録の上限に達しています',
          body:
            'Freeプランでは顧客は10件まで登録できます。新しい顧客を追加するには、Starter以上への切り替えをご検討ください。',
          meta: `現在 ${s.customerCount} / 10 件`,
          ctaLabel: 'アップグレードを相談する',
          ctaHref: '/contact',
        }
      }

      if ((s.customerRemaining ?? 999) <= 3) {
        return {
          tone: 'warning',
          title: `顧客登録の残りは ${s.customerRemaining} 件です`,
          body:
            'Freeプランでは顧客登録数に上限があります。今後も継続して顧客を追加する場合は、有料プランの検討をおすすめします。',
          meta: `現在 ${s.customerCount} / 10 件`,
          ctaLabel: 'プランについて相談する',
          ctaHref: '/contact',
        }
      }

      return {
        tone: 'info',
        title: `Freeプランで利用中です（残り ${s.customerRemaining} 件）`,
        body: 'Freeプランでは顧客は10件まで登録できます。',
        meta: `現在 ${s.customerCount} / 10 件`,
      }
    }

    if (s.planKey === 'starter') {
      return {
        tone: 'success',
        title: 'このプランでは顧客数の制限なく利用できます',
        body: 'Starterプランでは顧客マスタを継続的に追加できます。',
        meta: `現在のプラン: ${planName} / 登録済み ${s.customerCount} 件`,
      }
    }

    return {
      tone: 'success',
      title: 'このプランでは顧客数の制限なく利用できます',
      body: 'Standardプランでは顧客マスタを制限なく利用できます。',
      meta: `現在のプラン: ${planName} / 登録済み ${s.customerCount} 件`,
    }
  }

  if (kind === 'document') {
    if (s.planKey === 'free') {
      if ((s.issuedRemaining ?? 0) <= 0) {
        return {
          tone: 'danger',
          title: '今月の発行上限に達しています',
          body:
            'Freeプランでは発行は月5件までです。さらに発行するにはStarter以上への切り替えをご検討ください。',
          meta: `今月 ${s.issuedCount} / 5 件発行済み`,
          ctaLabel: 'アップグレードを相談する',
          ctaHref: '/contact',
        }
      }

      if ((s.issuedRemaining ?? 999) <= 2) {
        return {
          tone: 'warning',
          title: `今月の発行残数は ${s.issuedRemaining} 件です`,
          body:
            'Freeプランでは月5件まで発行できます。上限に近いため、継続利用する場合は有料プランもご検討ください。',
          meta: `今月 ${s.issuedCount} / 5 件発行済み`,
          ctaLabel: 'プランについて相談する',
          ctaHref: '/contact',
        }
      }

      return {
        tone: 'info',
        title: `Freeプランで利用中です（今月の残り ${s.issuedRemaining} 件）`,
        body: 'Freeプランでは発行は月5件までです。',
        meta: `今月 ${s.issuedCount} / 5 件発行済み`,
      }
    }

    if (s.planKey === 'starter') {
      const warn = s.issuedRemaining != null && s.issuedRemaining <= 5

      return warn
        ? {
            tone: 'warning',
            title: `今月の発行残数は ${s.issuedRemaining} 件です`,
            body: 'Starterプランでは月30件まで発行できます。',
            meta: `今月 ${s.issuedCount} / 30 件発行済み`,
          }
        : {
            tone: 'success',
            title: 'Starterプランで利用中です',
            body: 'Starterプランでは月30件まで発行できます。',
            meta: `今月 ${s.issuedCount} / 30 件発行済み`,
          }
    }

    return {
      tone: 'success',
      title: 'Standardプランで利用中です',
      body: 'Standardプランでは発行数の上限を気にせず利用できます。',
      meta: `今月 ${s.issuedCount} 件発行済み`,
    }
  }

  return {
    tone: 'neutral',
    title: 'プラン情報を取得しました',
    body: '',
  }
}

function getToneStyle(tone: ViewModel['tone']): React.CSSProperties {
  if (tone === 'danger') {
    return {
      background: '#fff1f2',
      border: '1px solid #fecdd3',
      color: '#881337',
    }
  }

  if (tone === 'warning') {
    return {
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      color: '#9a3412',
    }
  }

  if (tone === 'success') {
    return {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#166534',
    }
  }

  if (tone === 'info') {
    return {
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      color: '#1d4ed8',
    }
  }

  return {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    color: '#374151',
  }
}

export default function PlanStatusBanner({ kind }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    let alive = true

    async function run() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/me/billing-summary', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(String(json?.error ?? 'billing_summary_fetch_failed'))
        }

        if (!alive) return
        setSummary(normalizeSummary(json))
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'failed')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [])

  const vm = useMemo(() => {
    if (!summary) return null
    return buildViewModel(kind, summary)
  }, [kind, summary])

  if (loading) {
    return (
      <div style={{ ...baseBox, ...getToneStyle('neutral') }}>
        <div style={{ fontWeight: 700 }}>プラン情報を読み込み中です…</div>
      </div>
    )
  }

  if (error || !vm) {
    return (
      <div style={{ ...baseBox, ...getToneStyle('neutral') }}>
        <div style={{ fontWeight: 700 }}>プラン情報を取得できませんでした</div>
        <div style={{ marginTop: 6, fontSize: 14 }}>
          画面を再読み込みしても改善しない場合は、しばらくしてから再度お試しください。
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...baseBox, ...getToneStyle(vm.tone) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{vm.title}</div>

          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
            {vm.body}
          </div>

          {vm.meta ? (
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
              {vm.meta}
            </div>
          ) : null}
        </div>

        {vm.ctaLabel && vm.ctaHref ? (
          <div style={{ flexShrink: 0 }}>
            <Link href={vm.ctaHref} style={ctaLink}>
              {vm.ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const baseBox: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 12,
}

const ctaLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 14px',
  borderRadius: 10,
  background: '#111827',
  color: '#fff',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}