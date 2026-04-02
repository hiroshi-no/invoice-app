import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Seikyu Note | 請求書・見積書PDF作成アプリ',
  description:
    'Seikyu Note は、請求書・見積書の作成、PDFプレビュー、保存、発行まで行えるWebアプリです。',
}

const features = [
  {
    title: '請求書・見積書をすぐに作成',
    body: '書類タイトル、宛先、品目、金額、備考などを入力して、必要な帳票をスムーズに作成できます。',
  },
  {
    title: 'PDFプレビューで事前確認',
    body: '発行前にPDFの見た目を確認できるので、送付前のチェックや調整がしやすくなります。',
  },
  {
    title: '保存・発行まで一連で管理',
    body: '作成した書類は保存でき、発行やPDF保存までアプリ内でまとめて進められます。',
  },
  {
    title: '顧客情報を登録して活用',
    body: '顧客情報を管理して、書類作成時に再利用できます。繰り返し入力の手間を減らせます。',
  },
  {
    title: 'ブランド情報を反映',
    body: 'ロゴや事業者情報を設定して、自社に合わせた帳票デザインに整えられます。',
  },
  {
    title: '分かりやすい操作画面',
    body: '複雑すぎない構成で、日々の書類作成業務に使いやすい導線を意識しています。',
  },
]

const steps = [
  'アカウントを作成してログイン',
  '請求書または見積書を新規作成',
  '内容を入力してPDFプレビューで確認',
  '保存・発行して業務に利用',
]

const pricingPlans = [
  {
    name: 'Free',
    price: '0円',
    period: '/ 月',
    description: 'まず試したい方向けの無料プランです。',
    badge: 'はじめての方向け',
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
    name: 'Starter',
    price: '980円',
    period: '/ 月',
    description: '日常業務で継続利用しやすい標準プランです。',
    badge: 'おすすめ',
    items: [
      'Freeの全機能',
      '月30件までの発行',
      '顧客数無制限',
      'PDF履歴保存',
      'ロゴ反映',
      'ブランド設定',
      'テンプレート複数選択',
    ],
    ctaLabel: 'Starterを見る',
    ctaHref: '/contact',
    featured: true,
  },
  {
    name: 'Standard',
    price: '2,980円',
    period: '/ 月',
    description: '本格運用や継続管理に向いた上位プランです。',
    badge: '業務利用向け',
    items: [
      'Starterの全機能',
      '発行数ほぼ無制限',
      'PDF履歴無制限',
      '書類複製',
      '見積書から請求書への変換',
      'CSV出力',
      '月次レポート',
    ],
    ctaLabel: 'Standardを見る',
    ctaHref: '/contact',
    featured: false,
  },
]

export default function HomePage() {
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
            padding: 'clamp(40px, 7vw, 72px) 16px clamp(40px, 6vw, 64px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(24px, 4vw, 32px)',
            alignItems: 'center',
          }}
        >
          <div>
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
              請求書・見積書PDFアプリ
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
              Seikyu Note
              <br />
              請求書・見積書の作成を、
              <br />
              もっとシンプルに
            </h1>

            <p
              style={{
                marginTop: 20,
                fontSize: 'clamp(15px, 2.2vw, 17px)',
                lineHeight: 1.9,
                color: '#4b5563',
                maxWidth: 720,
              }}
            >
              Seikyu Note は、請求書・見積書の作成、PDFプレビュー、保存、発行までを
              ひとつの流れで管理できるWebアプリです。
              日々の書類業務を、分かりやすく扱いやすい形に整えます。
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 28,
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
                ログイン / 新規登録
              </Link>

              <Link
                href="/contact"
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
                お問い合わせ
              </Link>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                marginTop: 22,
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              <span>請求書・見積書作成</span>
              <span>PDFプレビュー</span>
              <span>PDF保存</span>
              <span>顧客管理</span>
              <span>ブランド設定</span>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: 'clamp(18px, 3vw, 24px)',
              background: '#fff',
              boxShadow: '0 16px 40px rgba(17,24,39,0.06)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                background: '#111827',
                color: '#fff',
                padding: '18px 18px 16px',
              }}
            >
              <div style={{ fontSize: 13, color: '#d1d5db' }}>サンプルイメージ</div>
              <div style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, marginTop: 6 }}>
                御見積書
              </div>
              <div style={{ fontSize: 13, color: '#d1d5db', marginTop: 8 }}>
                見積番号: EST-2026-001
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <InfoRow label="宛先" value="株式会社サンプル 御中" />
              <InfoRow label="タイトル" value="Webサイト制作お見積書" />
              <InfoRow label="有効期限" value="2026-04-30" />
            </div>

            <div
              style={{
                marginTop: 18,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                overflowX: 'auto',
                overflowY: 'hidden',
              }}
            >
              <div style={{ minWidth: 520 }}>
                <TableHeader />
                <TableRow desc="デザイン作成" qty="1" unit="80,000円" total="80,000円" />
                <TableRow desc="コーディング" qty="1" unit="120,000円" total="120,000円" />
                <TableRow desc="公開準備" qty="1" unit="30,000円" total="30,000円" />
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                marginLeft: 'auto',
                width: '100%',
                maxWidth: 280,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <AmountRow label="小計" value="230,000円" />
              <AmountRow label="税" value="23,000円" />
              <AmountRow label="合計" value="253,000円" strong />
            </div>
          </div>
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
            Seikyu Note でできること
          </h2>
          <p
            style={{
              marginTop: 14,
              color: '#4b5563',
              lineHeight: 1.9,
              maxWidth: 760,
            }}
          >
            日々の請求書・見積書作成に必要な機能を、使いやすい流れでまとめています。
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 18,
              marginTop: 28,
            }}
          >
            {features.map((item) => (
              <div
                key={item.title}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 20,
                  background: '#fff',
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    marginTop: 12,
                    color: '#4b5563',
                    lineHeight: 1.8,
                    fontSize: 15,
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          marginTop: 56,
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
            ご利用の流れ
          </h2>

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
      料金プラン
    </h2>

    <p
      style={{
        marginTop: 14,
        color: '#4b5563',
        lineHeight: 1.9,
        maxWidth: 760,
      }}
    >
      まずは無料で使い始めて、業務量に合わせてアップグレードできます。
      基本作成は無料で試せて、発行数やブランド設定などの継続利用向け機能を有料プランで拡張できます。
    </p>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18,
        marginTop: 28,
      }}
    >
      {pricingPlans.map((plan) => (
        <PricingCard key={plan.name} {...plan} />
      ))}
    </div>

    <p
      style={{
        marginTop: 18,
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 1.8,
      }}
    >
      ※ 表示内容や価格は今後変更する場合があります。<br />
      ※ 有料プラン導入時は、支払方法・契約更新・解約条件をサービス上でご案内します。
    </p>
  </div>
</section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginTop: 28,
            }}
          >
            {steps.map((step, index) => (
              <div
                key={step}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 20,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: '#111827',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {index + 1}
                </div>
                <p
                  style={{
                    marginTop: 14,
                    marginBottom: 0,
                    lineHeight: 1.8,
                    color: '#374151',
                    fontSize: 15,
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
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
              Seikyu Note を始める
            </h2>

            <p
              style={{
                marginTop: 14,
                color: '#d1d5db',
                lineHeight: 1.9,
                maxWidth: 760,
              }}
            >
              ログイン・新規登録後すぐに書類作成を始められます。
              導入前のご相談や機能に関するお問い合わせも受け付けています。
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
                ログイン / 新規登録
              </Link>

              <Link
                href="/contact"
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
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function PricingCard({
  name,
  price,
  period,
  description,
  badge,
  items,
  ctaLabel,
  ctaHref,
  featured,
}: {
  name: string
  price: string
  period: string
  description: string
  badge: string
  items: string[]
  ctaLabel: string
  ctaHref: string
  featured?: boolean
}) {
  return (
    <div
      style={{
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

      <h3
        style={{
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
        }}
      >
        {name}
      </h3>

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
          color: '#4b5563',
          lineHeight: 1.8,
          fontSize: 14,
        }}
      >
        {description}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '84px minmax(0, 1fr)',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid #f3f4f6',
        fontSize: 14,
      }}
    >
      <div style={{ color: '#6b7280' }}>{label}</div>
      <div style={{ color: '#111827', fontWeight: 600, minWidth: 0 }}>{value}</div>
    </div>
  )
}

function TableHeader() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 0.5fr 0.8fr 0.8fr',
        gap: 12,
        padding: '12px 14px',
        background: '#f9fafb',
        fontSize: 13,
        fontWeight: 700,
        color: '#374151',
      }}
    >
      <div>内容</div>
      <div>数量</div>
      <div>単価</div>
      <div>金額</div>
    </div>
  )
}

function TableRow({
  desc,
  qty,
  unit,
  total,
}: {
  desc: string
  qty: string
  unit: string
  total: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 0.5fr 0.8fr 0.8fr',
        gap: 12,
        padding: '12px 14px',
        borderTop: '1px solid #f3f4f6',
        fontSize: 13,
        color: '#374151',
      }}
    >
      <div>{desc}</div>
      <div>{qty}</div>
      <div>{unit}</div>
      <div>{total}</div>
    </div>
  )
}

function AmountRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderBottom: strong ? 'none' : '1px solid #f3f4f6',
        fontWeight: strong ? 800 : 500,
        fontSize: strong ? 18 : 14,
        color: strong ? '#111827' : '#374151',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}