import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Seikyu Note | 請求書・見積書PDF作成アプリ',
  description:
    'Seikyu Note は、請求書・見積書の作成、PDFプレビュー、保存、発行まで行えるWebアプリです。',
}

const features = [
  {
    title: '請求書・見積書をすぐ作成',
    body: '書類を新規作成して、タイトル、宛先、品目、金額、備考などをまとめて入力できます。',
  },
  {
    title: 'PDFプレビューで見た目を確認',
    body: '発行前にPDFのレイアウトを確認できるので、提出前のチェックがしやすくなります。',
  },
  {
    title: '保存・発行までアプリ内で完結',
    body: '作成した書類は保存でき、発行後のPDF保存まで一連の流れで進められます。',
  },
  {
    title: '顧客情報を管理',
    body: '顧客情報を登録して、書類作成時に活用できます。繰り返し入力の手間を減らせます。',
  },
  {
    title: 'ブランド設定に対応',
    body: 'ロゴや表記情報を設定して、自社向けの帳票デザインに整えられます。',
  },
  {
    title: 'シンプルな操作画面',
    body: '複雑な設定を増やしすぎず、日常業務で使いやすい導線を重視した構成です。',
  },
]

const steps = [
  'アカウントを作成してログイン',
  '請求書または見積書を新規作成',
  '内容を入力し、PDFプレビューで確認',
  '保存・発行して業務に利用',
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
              書類作成からPDF発行まで、
              <br />
              シンプルに管理
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
              ひとつの流れで進められるWebアプリです。
              日々の書類業務を、分かりやすく扱いやすい形に整理します。
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
            書類作成の基本機能を中心に、日々の業務で使いやすい流れにまとめています。
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
            利用の流れ
          </h2>

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
              Seikyu Note を使い始める
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
              導入前のご相談や機能についてのお問い合わせも受け付けています。
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