'use client'

import { useEffect, useMemo, useState } from 'react'

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

function limitLabel(value: number | null, suffix = '件') {
  if (value == null) return '上限なし'
  return `${value}${suffix}`
}

function boolLabel(v: boolean) {
  return v ? '利用可' : '利用不可'
}

function getPlanDescription(planKey: PlanKey) {
  if (planKey === 'free') {
    return {
      issued: '月5件まで',
      customers: '10件まで',
      pdf: '5件まで',
      branding: '不可',
    }
  }

  if (planKey === 'starter') {
    return {
      issued: '月30件まで',
      customers: '無制限',
      pdf: '100件まで',
      branding: '利用可',
    }
  }

  return {
    issued: '実質無制限',
    customers: '無制限',
    pdf: '無制限',
    branding: '利用可',
  }
}

export default function BillingSettingsClient({
  checkoutStatus,
}: {
  checkoutStatus?: string
}) {
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setError(null)
        } else {
          setBilling(null)
          setError(json?.message ?? 'プラン情報の取得に失敗しました。')
        }
      } catch {
        if (!alive) return
        setBilling(null)
        setError('プラン情報の取得に失敗しました。')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  async function startCheckout(planKey: PlanKey) {
    if (planKey === 'free') return

    setBusyPlan(planKey)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planKey }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json?.ok || !json?.url) {
        setError(
          typeof json?.message === 'string' && json.message.trim()
            ? json.message
            : 'Stripe Checkout の開始に失敗しました。'
        )
        return
      }

      window.location.href = String(json.url)
    } catch {
      setError('Stripe Checkout の開始に失敗しました。')
    } finally {
      setBusyPlan(null)
    }
  }

  async function openPortal() {
    setPortalBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        credentials: 'include',
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json?.ok || !json?.url) {
        setError(
          typeof json?.message === 'string' && json.message.trim()
            ? json.message
            : '請求情報管理ページの起動に失敗しました。'
        )
        return
      }

      window.location.href = String(json.url)
    } catch {
      setError('請求情報管理ページの起動に失敗しました。')
    } finally {
      setPortalBusy(false)
    }
  }

  const currentPlanText = useMemo(() => {
    if (!billing) return '-'
    return planLabel(billing.planKey)
  }, [billing])

  const checkoutMessage = useMemo(() => {
    if (checkoutStatus === 'success') {
      return {
        kind: 'success' as const,
        text: 'チェックアウト完了画面に戻りました。プラン反映は数秒かかる場合があります。',
      }
    }

    if (checkoutStatus === 'cancel') {
      return {
        kind: 'neutral' as const,
        text: 'プラン変更はキャンセルされました。',
      }
    }

    return null
  }, [checkoutStatus])

  return (
    <div style={{ marginTop: 16 }}>
      {checkoutMessage ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            border: `1px solid ${checkoutMessage.kind === 'success' ? '#86efac' : '#d1d5db'}`,
            background: checkoutMessage.kind === 'success' ? '#f0fdf4' : '#f9fafb',
            color: '#111827',
          }}
        >
          {checkoutMessage.text}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #fca5a5',
            background: '#fef2f2',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>現在のプラン</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '読み込み中…' : currentPlanText}</div>

        {!loading && billing ? (
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
            <div>対象月: {billing.yearMonth}</div>
            <div>
              発行数: {billing.issuedCount} / {limitLabel(billing.issuedLimit)}
            </div>
            <div>
              PDF保存数: {billing.savedPdfCount} / {limitLabel(billing.savedPdfLimit)}
            </div>
            <div>
              顧客数: {billing.customerCount} / {limitLabel(billing.customerLimit)}
            </div>
            <div>ブランド設定: {boolLabel(billing.brandingEnabled)}</div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {(['free', 'starter', 'standard'] as const).map((planKey) => {
          const desc = getPlanDescription(planKey)
          const current = billing?.planKey === planKey
          const isPaid = planKey === 'starter' || planKey === 'standard'
          const disabled = loading || !isPaid || busyPlan !== null || current || portalBusy

          return (
            <div
              key={planKey}
              style={{
                border: current ? '2px solid #111827' : '1px solid #e5e7eb',
                borderRadius: 14,
                background: '#fff',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{planLabel(planKey)}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                    {current ? '現在のプラン' : '選択可能'}
                  </div>
                </div>

                {current ? (
                  <div
                    style={{
                      height: 28,
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      borderRadius: 999,
                      background: '#111827',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    利用中
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                <div>発行: {desc.issued}</div>
                <div>顧客: {desc.customers}</div>
                <div>PDF履歴: {desc.pdf}</div>
                <div>ブランド設定: {desc.branding}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                {planKey === 'free' ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #d1d5db',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                    }}
                  >
                    Free は初期プランです
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCheckout(planKey)}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: current ? '#9ca3af' : '#111827',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.7 : 1,
                    }}
                  >
                    {busyPlan === planKey
                      ? '移動中…'
                      : current
                        ? '現在利用中です'
                        : `${planLabel(planKey)} を選択`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
          padding: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>請求情報を管理</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', marginBottom: 12 }}>
          有料プランをご利用中の場合は、Stripe の管理画面で支払い方法の変更や契約状況の確認ができます。
        </div>

        <button
          type="button"
          onClick={openPortal}
          disabled={loading || portalBusy || busyPlan !== null}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: '#111827',
            color: '#fff',
            fontWeight: 700,
            cursor: loading || portalBusy || busyPlan !== null ? 'not-allowed' : 'pointer',
            opacity: loading || portalBusy || busyPlan !== null ? 0.7 : 1,
          }}
        >
          {portalBusy ? '移動中…' : '請求情報を管理'}
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#f9fafb',
          color: '#374151',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>補足</div>
        <div>プラン変更の最終反映は Stripe の webhook 同期後に行われます。</div>
        <div>チェックアウト完了直後は、数秒ほど現在プラン表示の反映に時間がかかる場合があります。</div>
      </div>
    </div>
  )
}