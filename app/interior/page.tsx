import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function InteriorPage() {
  return (
    <div
      style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '40px 16px 72px',
        fontFamily: 'sans-serif',
        color: '#111827',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <Link href="/" style={topLink}>
          ← トップへ戻る
        </Link>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/login?entry=interior&entry_path=/interior&entry_source=organic"
            style={subCta}
          >
            無料で試す
          </Link>
          <Link href="/documents/new" style={subCtaGhost}>
            ログイン済みなら新規作成へ
          </Link>
        </div>
      </div>

      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)',
          padding: '28px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            color: '#374151',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          内装・小規模工事向け
        </div>

        <h1
          style={{
            margin: '0 0 12px 0',
            fontSize: 34,
            lineHeight: 1.3,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          工事名や現場名を整理して、
          <br />
          見積書・請求書を作りやすく
        </h1>

        <p
          style={{
            margin: '0 0 18px 0',
            fontSize: 15,
            lineHeight: 1.9,
            color: '#4b5563',
            maxWidth: 780,
          }}
        >
          Seikyu Note は、内装業者や小規模工事業向けに
          工事名・現場名・工期・請求区分・前回まで請求額・今回請求額・残額などの情報を
          帳票に整理して載せやすい請求書作成アプリです。
          案件単位で見積書・請求書を整えたい個人事業主に向いています。
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login?entry=interior&entry_path=/interior&entry_source=organic"
            style={mainCta}
          >
            工事向け設定で始める
          </Link>

          <Link href="/documents/new?type=quotation" style={ghostCta}>
            ログイン済みなら見積書を作成
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>こんな方に向いています</h2>

        <div style={grid3}>
          <FeatureCard
            title="内装業者"
            text="店舗改装や内装工事など、案件単位で見積書と請求書を管理したい方向けです。"
          />
          <FeatureCard
            title="小規模工事業"
            text="工事名・現場名・工期を整理した帳票を出したい個人事業主に向いています。"
          />
          <FeatureCard
            title="修理・施工業"
            text="単純な請求だけでなく、進捗のある案件も整理しやすくなります。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>内装・工事向けで使いやすいポイント</h2>

        <div style={grid2}>
          <InfoCard
            title="案件情報を整理しやすい"
            bullets={[
              '工事名',
              '現場名',
              '工事場所',
              '工期',
              '見積有効期限',
            ]}
          />
          <InfoCard
            title="請求進捗を整理しやすい"
            bullets={[
              '請求区分',
              '前回まで請求額',
              '今回請求額',
              '残額',
              '支払条件の整理',
            ]}
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>作成の流れ</h2>

        <div style={grid3}>
          <StepCard
            step="1"
            title="ログイン"
            text="工事向け入口からログインすると、初期設定を interior に寄せられます。"
          />
          <StepCard
            step="2"
            title="見積書・請求書を作成"
            text="工事名や現場名などを入れながら、案件単位で帳票を作成します。"
          />
          <StepCard
            step="3"
            title="PDFで確認"
            text="編集画面のプレビューで確認し、そのまま保存・発行へ進めます。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>よくある用途</h2>

        <div style={grid2}>
          <ExampleCard
            title="見積書"
            text="店舗内装工事、原状回復、軽微改修、修繕工事、小規模施工の見積提示に。"
          />
          <ExampleCard
            title="請求書"
            text="完工後の最終請求、中間請求、前受金請求などの案件単位の請求に。"
          />
        </div>
      </section>

      <section
        style={{
          marginTop: 34,
          border: '1px solid #e5e7eb',
          borderRadius: 18,
          background: '#fafafa',
          padding: '22px 20px',
        }}
      >
        <h2 style={{ ...sectionTitle, marginTop: 0 }}>まずは interior プロファイルで試す</h2>
        <p
          style={{
            margin: '0 0 14px 0',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4b5563',
          }}
        >
          内装・小規模工事向けの初期設定でログインすると、
          新規書類作成時の帳票タイプを interior で始めやすくなります。
        </p>

        <Link
          href="/login?entry=interior&entry_path=/interior&entry_source=organic"
          style={mainCta}
        >
          工事向けでログインする
        </Link>
      </section>
    </div>
  )
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={card}>
      <div style={cardTitle}>{title}</div>
      <div style={cardText}>{text}</div>
    </div>
  )
}

function InfoCard({
  title,
  bullets,
}: {
  title: string
  bullets: string[]
}) {
  return (
    <div style={card}>
      <div style={cardTitle}>{title}</div>
      <ul style={list}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({
  step,
  title,
  text,
}: {
  step: string
  title: string
  text: string
}) {
  return (
    <div style={card}>
      <div
        style={{
          display: 'inline-flex',
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          background: '#111827',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {step}
      </div>
      <div style={cardTitle}>{title}</div>
      <div style={cardText}>{text}</div>
    </div>
  )
}

function ExampleCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={card}>
      <div style={cardTitle}>{title}</div>
      <div style={cardText}>{text}</div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 14px 0',
  fontSize: 22,
  fontWeight: 800,
  color: '#111827',
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
}

const grid3: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
}

const card: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fff',
  padding: 18,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

const cardTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  marginBottom: 8,
  color: '#111827',
}

const cardText: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.8,
  color: '#4b5563',
}

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: '#374151',
  lineHeight: 1.9,
  fontSize: 14,
}

const topLink: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
}

const mainCta: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
}

const ghostCta: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
}

const subCta: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 13,
}

const subCtaGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 13,
}