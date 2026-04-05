'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type Kind = 'document' | 'customers' | 'branding'
type PlanKey = 'free' | 'starter' | 'standard'

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
}

type BannerMessage = {
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  note?: string
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

function isUpgradeRecommended(kind: Kind, billing: BillingSummary) {
  if (kind === 'document') {
    if (billing.issuedRemaining === 0 && billing.issuedLimit != null) return true
    if (billing.savedPdfRemaining === 0 && billing.savedPdfLimit != null) return true
  }

  if (kind === 'customers' && billing.customerRemaining === 0 && billing.customerLimit != null) {
    return true
  }

  if (kind === 'branding' && !billing.brandingEnabled) {
    return true
  }

  return false
}

function getTone(kind: Kind, billing: BillingSummary) {
  if (isUpgradeRecommended(kind, billing)) {
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

function buildDocumentMessage(billing: BillingSummary): BannerMessage {
  const title = `現在プラン: ${planLabel(billing.planKey)}`

  const issuedLine =
    billing.issuedLimit == null
      ? `発行数: ${billing.issuedCount} 件（上限なし）`
      : `発行数: ${billing.issuedCount} / ${billing.issuedLimit} 件`

  const savedPdfLine =
    billing.savedPdfLimit == null
      ? `PDF保存数: ${billing.savedPdfCount} 件（上限なし）`
      : `PDF保存数: ${billing.savedPdfCount} / ${billing.savedPdfLimit} 件`

  if (billing.issuedRemaining === 0 && billing.issuedLimit != null) {
    return {
      title,
      body: `今月の発行上限に達しています。`,
      note: `${issuedLine} / ${savedPdfLine}`,
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  if (billing.savedPdfRemaining === 0 && billing.savedPdfLimit != null) {
    return {
      title,
      body: `今月のPDF保存上限に達しています。`,
      note: `${issuedLine} / ${savedPdfLine}`,
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  if (billing.issuedLimit == null && billing.savedPdfLimit == null) {
    return {
      title,
      body: `今月の書類機能は上限なく利用できます。`,
      note: `${issuedLine} / ${savedPdfLine}`,
    }
  }

  if (billing.issuedLimit == null) {
    return {
      title,
      body: `発行数制限はありません。PDF保存状況を確認できます。`,
      note: `${issuedLine} / ${savedPdfLine}`,
    }
  }

  if (billing.savedPdfLimit == null) {
    return {
      title,
      body: `今月の発行可能数は残り ${billing.issuedRemaining} 件です。`,
      note: `${issuedLine} / ${savedPdfLine}`,
    }
  }

  return {
    title,
    body: `今月の発行可能数は残り ${billing.issuedRemaining} 件です。PDF保存状況も確認できます。`,
    note: `${issuedLine} / ${savedPdfLine}`,
  }
}

function buildCustomersMessage(billing: BillingSummary): BannerMessage {
  const title = `現在プラン: ${planLabel(billing.planKey)}`

  if (billing.customerLimit == null) {
    return {
      title,
      body: `現在のプランでは顧客数制限はありません。現在の登録数: ${billing.customerCount} 件`,
    }
  }

  if (billing.customerRemaining === 0) {
    return {
      title,
      body: `無料プランの顧客上限に達しています。現在の登録数: ${billing.customerCount} / ${billing.customerLimit} 件`,
      ctaLabel: 'プランを確認する',
      ctaHref: '/settings/billing',
    }
  }

  return {
    title,
    body: `無料プランでは顧客は ${billing.customerLimit} 件まで登録できます。現在の登録数: ${billing.customerCount} / ${billing.customerLimit} 件`,
  }
}

function buildBrandingMessage(billing: BillingSummary): BannerMessage {
  const title = `現在プラン: ${planLabel(billing.planKey)}`

  if (billing.brandingEnabled) {
    return {
      title,
      body: `現在のプランではブランド設定とロゴを利用できます。`,
    }
  }

  return {
    title,
    body: `ブランド設定とロゴは Starter 以上で利用できます。`,
    ctaLabel: 'プランを確認する',
    ctaHref: '/settings/billing',
  }
}

export default function PlanStatusBanner({
  kind,
  style,
}: {
  kind: Kind
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

        const json = await res.json()

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

  const message = useMemo<BannerMessage | null>(() => {
    if (!billing) return null

    if (kind === 'document') {
      return buildDocumentMessage(billing)
    }

    if (kind === 'customers') {
      return buildCustomersMessage(billing)
    }

    return buildBrandingMessage(billing)
  }, [billing, kind])

  if (loading || !billing || !message) return null

  const tone = getTone(kind, billing)
  const showUpgradeBadge = isUpgradeRecommended(kind, billing)

  return (
    <div
      style={{
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.text,
        borderRadius: 12,
        padding: '12px 14px',
        margin: '0 0 16px',
        ...style,
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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{message.title}</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{message.body}</div>

          {message.note ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, opacity: 0.9 }}>
              {message.note}
            </div>
          ) : null}
        </div>

        {showUpgradeBadge ? (
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
            要アップグレード
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
}