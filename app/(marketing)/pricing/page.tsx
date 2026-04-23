import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '料金プラン | Seikyu Note',
  description:
    'Seikyu Note の料金プラン一覧です。Free・Starter・Standard の違い、使える機能、向いている方を確認できます。',
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0円',
    period: '/ 月',
    badge: 'はじめての方向け',
    description: 'まずは無料で使い始めたい個人事業主向けのプランです。',
    summary:
      '請求書・見積書の基本作成を試したい方、まずは操作感を確認したい方に向いています。',
    items: [
      '請求書・見積書の作成',
      'PDFプレビュー',
      'PDF保存',
      '顧客登録 10件まで',
      '月5件までの発行',
      '基本テンプレート 1種類',
    ],
    ctaLabel: '無料で始める',
    ctaHref: '/login',
    featured: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '980円',
    period: '/ 月',
    badge: 'おすすめ',
    description: '日々の請求業務で継続利用しやすい標準プランです。',
    summary:
      '案件数が増えてきた個人事業主や、顧客管理・ブランド設定も含めてしっかり使いたい方に向いています。',
    items: [
      'Freeの全機能',
      '月30件までの発行',
      '顧客数無制限',
      'PDF履歴保存',
      'ロゴ反映',
      'ブランド設定',
      'テンプレート複数選択',
    ],
    ctaLabel: 'Starterで始める',
    ctaHref: '/login?plan=starter',
    featured: true,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '2,980円',
    period: '/ 月',
    badge: '業務利用向け',
    description: '案件数が多い方や継続管理を重視する方向けの上位プランです。',
    summary:
      '発行数や保存数をあまり気にせず、より本格的に運用したい方に向いています。',
    items: [
      'Starterの全機能',
      '発行数ほぼ無制限',
      'PDF履歴無制限',
      '書類複製',
      '見積書から請求書への変換',
      'CSV出力',
      '月次レポート',
    ],
    ctaLabel: 'Standardで始める',
    ctaHref: '/login?plan=standard',
    featured: false,
  },
] as const

const comparisonRows = [
  {
    label: '請求書・見積書の作成',
    values: ['〇', '〇', '〇'],
  },
  {
    label: 'PDFプレビュー',
    values: ['〇', '〇', '〇'],
  },
  {
    label: 'PDF保存',
    values: ['〇', '〇', '〇'],
  },
  {
    label: '月間発行数',
    values: ['5件まで', '30件まで', 'ほぼ無制限'],
  },
  {
    label: '顧客登録数',
    values: ['10件まで', '無制限', '無制限'],
  },
  {
    label: 'PDF履歴保存',
    values: ['-', '〇', '〇（上限大）'],
  },
  {
    label: 'ロゴ反映',
    values: ['-', '〇', '〇'],
  },
  {
    label: 'ブランド設定',
    values: ['-', '〇', '〇'],
  },
  {
    label: 'テンプレート複数選択',
    values: ['-', '〇', '〇'],
  },
  {
    label: '書類複製',
    values: ['-', '-', '〇'],
  },
  {
    label: '見積書から請求書への変換',
    values: ['-', '-', '〇'],
  },
  {
    label: 'CSV出力',
    values: ['-', '-', '〇'],
  },
  {
    label: '月次レポート',
    values: ['-', '-', '〇'],
  },
] as const

export default function PricingPage() {
  return (
    <main style={{ background: '#fff', color: '#111827' }}>
      <section
        style={{
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: 'clamp(40px, 7vw, 72px) 16px clamp(34px, 6vw, 56px)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
              color: '#374151',
              background: '#e5e7eb',
              borderRadius: 999,
              padding: '6px 10px',
              marginBottom: 16,
            }}
          >
            料金プラン
          </div>

          <h1
            style={{
              fontSize: 'clamp(30px, 6vw, 44px)',
              lineHeight: 1.25,
              fontWeight: 800,
              margin: 0,
              wordBreak: 'keep-all',
            }}
          >
            Seikyu Note の料金プラン
          </h1>

          <p
            style={{
              marginTop: 18,
              fontSize: 'clamp(15px, 2.2vw, 17px)',
              lineHeight: 1.9,
              color: '#4b5563',
              maxWidth: 820,
            }}
          >
            個人事業主やフリーランスが、案件数や請求業務の量に合わせて選びやすいように、
            Free・Starter・Standard の3つのプランを用意しています。
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 24,
            }}
          >
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                background: '#111827',
                color: '#fff',
                padding: '14px 18px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              無料で始める
            </Link>

            <Link
              href="#starter"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                background: '#fff',
                color: '#111827',
                padding: '14px 18px',
                borderRadius: 10,
                fontWeight: 700,
                border: '1px solid #d1d5db',
              }}
            >
              おすすめプランを見る
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: 'clamp(34px, 5vw, 54px) 16px 24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
            }}
          >
            {plans.map((plan) => (
              <PlanCard key={plan.id} {...plan} />
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          marginTop: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: 'clamp(40px, 6vw, 64px) 16px',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 32px)',
              lineHeight: 1.35,
              fontWeight: 800,
              margin: 0,
            }}
          >
            プラン比較
          </h2>

          <p
            style={{
              marginTop: 14,
              color: '#4b5563',
              lineHeight: 1.9,
              maxWidth: 760,
            }}
          >
            まずは無料で使い始めて、必要に応じて上位プランへ切り替える運用がしやすい構成です。
          </p>

          <div
            style={{
              marginTop: 24,
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              overflowX: 'auto',
              background: '#fff',
            }}
          >
            <div style={{ minWidth: 760 }}>
              <ComparisonHeader />
              {comparisonRows.map((row) => (
                <ComparisonRow key={row.label} label={row.label} values={row.values} />
              ))}
            </div>
          </div>

          <p
            style={{
              marginTop: 14,
              fontSize: 13,
              color: '#6b7280',
              lineHeight: 1.8,
            }}
          >
            ※ 表示内容や価格は今後変更する場合があります。
          </p>
        </div>
      </section>

      <section>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: 'clamp(40px, 6vw, 64px) 16px 24px',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 32px)',
              lineHeight: 1.35,
              fontWeight: 800,
              margin: 0,
            }}
          >
            どのプランが向いているか
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
              marginTop: 24,
            }}
          >
            <AudienceCard
              title="Free が向いている方"
              points={[
                'まずは操作感を試したい',
                '請求書・見積書を少ない件数で使う予定',
                'まずは無料で始めたい',
              ]}
            />
            <AudienceCard
              title="Starter が向いている方"
              points={[
                '日常的に請求書・見積書を作成する',
                '顧客登録数を気にせず使いたい',
                'ロゴやブランド設定も使いたい',
              ]}
            />
            <AudienceCard
              title="Standard が向いている方"
              points={[
                '案件数・発行数が多い',
                '保存履歴や集計も重視したい',
                '本格的に継続運用したい',
              ]}
            />
          </div>
        </div>
      </section>

      <section
        style={{
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: 'clamp(40px, 6vw, 64px) 16px 80px',
          }}
        >
          <div
            style={{
              borderRadius: 20,
              background: '#111827',
              color: '#fff',
              padding: 'clamp(22px, 4vw, 36px) clamp(18px, 4vw, 28px)',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 30px)',
                lineHeight: 1.35,
                fontWeight: 800,
                margin: 0,
              }}
            >
              まずは無料で始めて、
              <br />
              必要に応じてプランを選べます
            </h2>

            <p
              style={{
                marginTop: 14,
                color: '#d1d5db',
                lineHeight: 1.9,
                maxWidth: 760,
              }}
            >
              アカウント作成後に利用を開始し、業務量や必要機能に応じてプランを選びやすい構成です。
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 24,
              }}
            >
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  background: '#fff',
                  color: '#111827',
                  padding: '14px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                無料で始める
              </Link>

              <Link
                href="/login?plan=starter"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  background: 'transparent',
                  color: '#fff',
                  padding: '14px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                Starterで始める
              </Link>

              <Link
                href="/login?plan=standard"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  background: 'transparent',
                  color: '#fff',
                  padding: '14px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                Standardで始める
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function PlanCard({
  id,
  name,
  price,
  period,
  badge,
  description,
  summary,
  items,
  ctaLabel,
  ctaHref,
  featured,
}: {
  id: string
  name: string
  price: string
  period: string
  badge: string
  description: string
  summary: string
  items: readonly string[]
  ctaLabel: string
  ctaHref: string
  featured?: boolean
}) {
  return (
    <div
      id={id}
      style={{
        scrollMarginTop: 96,
        border: featured ? '2px solid #111827' : '1px solid #e5e7eb',
        borderRadius: 20,
        padding: 22,
        background: '#fff',
        boxShadow: featured ? '0 16px 40px rgba(17,24,39,0.08)' : 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: featured ? '#111827' : '#4b5563',
          background: featured ? '#e5e7eb' : '#f3f4f6',
          borderRadius: 999,
          padding: '6px 10px',
          marginBottom: 14,
        }}
      >
        {badge}
      </div>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
        }}
      >
        {name}
      </h2>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 14,
        }}
      >
        <span
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        <span
          style={{
            fontSize: 14,
            color: '#6b7280',
          }}
        >
          {period}
        </span>
      </div>

      <p
        style={{
          marginTop: 14,
          marginBottom: 0,
          color: '#111827',
          lineHeight: 1.8,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {description}
      </p>

      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          color: '#4b5563',
          lineHeight: 1.8,
          fontSize: 14,
        }}
      >
        {summary}
      </p>

      <div
        style={{
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1px solid #f3f4f6',
          display: 'grid',
          gap: 10,
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.7,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 18,
                color: '#111827',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <Link
          href={ctaHref}
          style={{
            display: 'inline-block',
            width: '100%',
            textAlign: 'center',
            textDecoration: 'none',
            background: featured ? '#111827' : '#fff',
            color: featured ? '#fff' : '#111827',
            padding: '14px 16px',
            borderRadius: 10,
            fontWeight: 700,
            border: featured ? 'none' : '1px solid #d1d5db',
            boxSizing: 'border-box',
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}

function ComparisonHeader() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr',
        gap: 12,
        padding: '14px 16px',
        background: '#111827',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <div>項目</div>
      <div>Free</div>
      <div>Starter</div>
      <div>Standard</div>
    </div>
  )
}

function ComparisonRow({
  label,
  values,
}: {
  label: string
  values: readonly [string, string, string] | readonly string[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr',
        gap: 12,
        padding: '14px 16px',
        borderTop: '1px solid #f3f4f6',
        fontSize: 14,
        color: '#374151',
        alignItems: 'center',
      }}
    >
      <div style={{ fontWeight: 600, color: '#111827' }}>{label}</div>
      <div>{values[0]}</div>
      <div>{values[1]}</div>
      <div>{values[2]}</div>
    </div>
  )
}

function AudienceCard({
  title,
  points,
}: {
  title: string
  points: readonly string[]
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 20,
        background: '#fff',
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {title}
      </h3>

      <ul
        style={{
          margin: '14px 0 0 18px',
          padding: 0,
          color: '#374151',
          lineHeight: 1.9,
          fontSize: 14,
        }}
      >
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}