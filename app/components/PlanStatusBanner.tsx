'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type Kind = 'document' | 'customers' | 'branding'
type PlanKey = 'free' | 'starter' | 'standard'
type Tone = 'neutral' | 'warning' | 'danger'

type BillingSummary = {
  planKey: PlanKey
  yearMonth: string

  issuedCount: number
  savedPdfCount: number

  issuedLimit: number | null
  issuedRemaining: number | null

  savedPdfLimit: number | null
  savedPdfRemaining: number | null

  customerCount: number
  customerLimit: number | null
  customerRemaining: number | null

  brandingEnabled: boolean

  stripeStatus: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  scheduledCancelAt: string | null
}

type BillingSummaryResponse = {
  ok: boolean
  billing?: BillingSummary
  error?: string
  message?: string
}

type BannerMessage = {
  tone: Tone
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  note?: string
  badgeLabel?: string
}

function planLabel(planKey: PlanKey) {
  switch (planKey) {
    case 'free':
      return 'Free'
    case 'starter':
      return 'Starter'
    case 'standard':
      return 'Standard'
    default:
      return 'Free'
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getTone(tone: Tone) {
  if (tone === 'danger') {
    return {
      border: '#fecaca',
      bg: '#fef2f2',
      text: '#991b1b',
      badgeBg: '#fee2e2',
      badgeText: '#991b1b',
      buttonBg: '#991b1b',
      buttonText: '#ffffff',
    }
  }

  if (tone === 'warning') {
    return {
      border: '#f59e0b',
      bg: '#fffbeb',
      text: '#92400e',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
      buttonBg: '#111827',
      buttonText: '#ffffff',
    }
  }

  return {
    border: '#d1d5db',
    bg: '#f9fafb',
    text: '#111827',
    badgeBg: '#e5e7eb',
    badgeText: '#374151',
    buttonBg: '#111827',
    buttonText: '#ffffff',
  }
}

function buildCancelMessage(billing: BillingSummary): BannerMessage | null {
  if (!billing.cancelAtPeriodEnd && !billing.scheduledCancelAt) return null

  const scheduledAt = billing.scheduledCancelAt ?? billing.currentPeriodEnd
  const endDate = formatDate(scheduledAt)
  const plan = planLabel(billing.planKey)

  return {
    tone: 'warning',
    title: '契約中（次回更新なし）',
    body: endDate
      ? `${endDate} に終了予定です。終了までは ${plan} を利用できます。`
      : `現在の契約は次回更新されません。終了までは ${plan} を利用できます。`,
    ctaLabel: '請求情報を管理',
    ctaHref: '/settings/billing',
  }
}

function buildDocumentMessage(billing: BillingSummary): BannerMessage | null {
  const issuedLine =
    billing.issuedLimit == null
      ? `発行数: ${billing.issuedCount} 件（上限なし）`
      : `発行数: ${billing.issuedCount} / ${billing.issuedLimit} 件`

  const note = issuedLine

  if (
    billing.issuedLimit != null &&
    billing.issuedRemaining != null &&
    billing.issuedRemaining <= 0
  ) {
    return {
      tone: 'danger',
      title: '今月の発行上限に達しています',
      body: 'これ以上書類を発行するには、プラン変更が必要です。',
      note,
      badgeLabel: '要アップグレード',
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  if (
    billing.issuedLimit != null &&
    billing.issuedRemaining != null &&
    billing.issuedRemaining <= 3
  ) {
    return {
      tone: 'warning',
      title: '今月の発行可能数が少なくなっています',
      body: `今月の発行可能数は残り ${billing.issuedRemaining} 件です。`,
      note,
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  return null
}

function buildCustomersMessage(billing: BillingSummary): BannerMessage | null {
  if (billing.customerLimit == null || billing.customerRemaining == null) {
    return null
  }

  const note = `現在の登録数: ${billing.customerCount} / ${billing.customerLimit} 件`

  if (billing.customerRemaining <= 0) {
    return {
      tone: 'danger',
      title: '顧客登録数の上限に達しています',
      body: 'これ以上顧客を追加するには、プラン変更が必要です。',
      note,
      badgeLabel: '要アップグレード',
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  if (billing.customerRemaining <= 3) {
    return {
      tone: 'warning',
      title: '顧客登録数の上限が近づいています',
      body: `あと ${billing.customerRemaining} 件まで顧客を登録できます。`,
      note,
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  return null
}

function buildBrandingMessage(billing: BillingSummary): BannerMessage | null {
  if (billing.brandingEnabled) return null

  return {
    tone: 'warning',
    title: 'ブランド設定は現在のプランでは利用できません',
    body: 'ロゴ、カラー、発行者情報などのブランド設定を使うには、Starter 以上のプランが必要です。',
    badgeLabel: 'プラン制限',
    ctaLabel: 'プランを確認する',
    ctaHref: '/settings/billing',
  }
}

function buildKindMessage(billing: BillingSummary, kind?: Kind): BannerMessage | null {
  if (!kind) return null

  if (kind === 'document') {
    return buildDocumentMessage(billing)
  }

  if (kind === 'customers') {
    return buildCustomersMessage(billing)
  }

  return buildBrandingMessage(billing)
}

export default function PlanStatusBanner({
  kind,
  style,
}: {
  kind?: Kind
  style?: CSSProperties
}) {
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const res = await fetch('/api/me/billing-summary', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })

        const json = (await res.json()) as BillingSummaryResponse

        if (!alive) return

        if (res.ok && json?.ok && json?.billing) {
          setBilling(json.billing)
        } else {
          setBilling(null)
        }
      } catch {
        if (!alive) return
        setBilling(null)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const messages = useMemo<BannerMessage[]>(() => {
    if (!billing) return []

    const list: BannerMessage[] = []

    const cancelMessage = buildCancelMessage(billing)
    const kindMessage = buildKindMessage(billing, kind)

    if (cancelMessage) list.push(cancelMessage)
    if (kindMessage) list.push(kindMessage)

    return list
  }, [billing, kind])

  if (loading || !billing || messages.length === 0) return null

  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        margin: '0 0 16px',
        ...style,
      }}
    >
      {messages.map((message, index) => {
        const tone = getTone(message.tone)

        return (
          <div
            key={`${message.title}-${index}`}
            style={{
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.text,
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {message.title}
                </div>

                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{message.body}</div>

                {message.note ? (
                  <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, opacity: 0.9 }}>
                    {message.note}
                  </div>
                ) : null}
              </div>

              {message.badgeLabel ? (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 8px',
                    borderRadius: 999,
                    background: tone.badgeBg,
                    color: tone.badgeText,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {message.badgeLabel}
                </div>
              ) : null}
            </div>

            {message.ctaLabel && message.ctaHref ? (
              <div style={{ marginTop: 10 }}>
                <Link
                  href={message.ctaHref}
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: tone.buttonBg,
                    color: tone.buttonText,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {message.ctaLabel}
                </Link>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}