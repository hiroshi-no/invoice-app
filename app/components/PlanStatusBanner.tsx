'use client'

import { useEffect, useMemo, useState } from 'react'

type Kind = 'document' | 'customers' | 'branding'
type PlanKey = 'free' | 'starter' | 'standard'

type BillingSummary = {
  planKey: PlanKey
  yearMonth: string
  issuedCount: number
  savedPdfCount: number
  issuedLimit: number | null
  issuedRemaining: number | null
  customerCount: number
  customerLimit: number | null
  customerRemaining: number | null
  brandingEnabled: boolean
}

function planLabel(planKey: PlanKey) {
  switch (planKey) {
    case 'free':
      return 'Free'
    case 'starter':
      return 'Starter'
    case 'standard':
      return 'Standard'
  }
}

function getTone(kind: Kind, billing: BillingSummary) {
  if (kind === 'document' && billing.issuedRemaining === 0 && billing.issuedLimit != null) {
    return {
      border: '#f59e0b',
      bg: '#fffbeb',
      text: '#92400e',
    }
  }

  if (kind === 'customers' && billing.customerRemaining === 0 && billing.customerLimit != null) {
    return {
      border: '#f59e0b',
      bg: '#fffbeb',
      text: '#92400e',
    }
  }

  if (kind === 'branding' && !billing.brandingEnabled) {
    return {
      border: '#f59e0b',
      bg: '#fffbeb',
      text: '#92400e',
    }
  }

  return {
    border: '#d1d5db',
    bg: '#f9fafb',
    text: '#111827',
  }
}

export default function PlanStatusBanner({
  kind,
  style,
}: {
  kind: Kind
  style?: React.CSSProperties
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

  const message = useMemo(() => {
    if (!billing) return null

    if (kind === 'document') {
      if (billing.issuedLimit == null) {
        return {
          title: `現在プラン: ${planLabel(billing.planKey)}`,
          body: `今月の発行数は ${billing.issuedCount} 件です。発行数制限はありません。`,
        }
      }

      if (billing.issuedRemaining === 0) {
        return {
          title: `現在プラン: ${planLabel(billing.planKey)}`,
          body: `今月の発行上限に達しています。使用状況: ${billing.issuedCount} / ${billing.issuedLimit} 件`,
        }
      }

      return {
        title: `現在プラン: ${planLabel(billing.planKey)}`,
        body: `今月の発行可能数は残り ${billing.issuedRemaining} 件です。使用状況: ${billing.issuedCount} / ${billing.issuedLimit} 件`,
      }
    }

    if (kind === 'customers') {
      if (billing.customerLimit == null) {
        return {
          title: `現在プラン: ${planLabel(billing.planKey)}`,
          body: `現在のプランでは顧客数制限はありません。現在の登録数: ${billing.customerCount} 件`,
        }
      }

      if (billing.customerRemaining === 0) {
        return {
          title: `現在プラン: ${planLabel(billing.planKey)}`,
          body: `無料プランの顧客上限に達しています。現在の登録数: ${billing.customerCount} / ${billing.customerLimit} 件`,
        }
      }

      return {
        title: `現在プラン: ${planLabel(billing.planKey)}`,
        body: `無料プランでは顧客は ${billing.customerLimit} 件まで登録できます。現在の登録数: ${billing.customerCount} / ${billing.customerLimit} 件`,
      }
    }

    if (billing.brandingEnabled) {
      return {
        title: `現在プラン: ${planLabel(billing.planKey)}`,
        body: `現在のプランではブランド設定とロゴを利用できます。`,
      }
    }

    return {
      title: `現在プラン: ${planLabel(billing.planKey)}`,
      body: `ブランド設定とロゴは Starter 以上で利用できます。`,
    }
  }, [billing, kind])

  if (loading || !message) return null

  const tone = getTone(kind, billing!)

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
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{message.title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{message.body}</div>
    </div>
  )
}