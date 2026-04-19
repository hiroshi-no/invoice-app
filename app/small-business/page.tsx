import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function SmallBusinessPage() {
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
            href="/login?entry=standard&entry_path=/small-business&entry_source=organic"
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
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
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
          個人事業主全般向け
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
          まずは標準の帳票で、
          <br />
          請求書・見積書を
          <br />
          シンプルに作成
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
          Seikyu Note は、個人事業主全般が使いやすい標準的な請求書・見積書作成アプリです。
          まずはシンプルな帳票から始めたい方に向いており、請求先・明細・備考・支払期日や有効期限を整理して、
          見やすいPDFをすぐに作れます。
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login?entry=standard&entry_path=/small-business&entry_source=organic"
            style={mainCta}
          >
            標準設定で始める
          </Link>

          <Link href="/documents/new?type=invoice" style={ghostCta}>
            ログイン済みなら請求書を作成
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>こんな方に向いています</h2>

        <div style={grid3}>
          <FeatureCard
            title="まずは汎用帳票で十分な方"
            text="複雑な業種別設定より、標準の請求書・見積書をすぐ使いたい方向けです。"
          />
          <FeatureCard
            title="個人事業主・副業事業者"
            text="取引先ごとの請求書や見積書を、シンプルに整理したい方に向いています。"
          />
          <FeatureCard
            title="サービス業・小規模事業"
            text="業種特有の追加項目が少なく、まずは基本帳票から始めたい方に向いています。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>標準モードで使いやすいポイント</h2>

        <div style={grid2}>
          <InfoCard
            title="すぐに始めやすい"
            bullets={[
              '請求先・明細・備考の基本入力',
              '請求書と見積書の両方に対応',
              '複雑な初期設定なしで使いやすい',
            ]}
          />
          <InfoCard
            title="日常業務に使いやすい"
            bullets={[
              'PDFプレビューで事前確認',
              '保存・発行まで一連で管理',
              '顧客情報を登録して再利用',
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
            text="標準の入口からログインすると、汎用的な帳票タイプで始めやすくなります。"
          />
          <StepCard
            step="2"
            title="書類を作成"
            text="請求書または見積書を作成し、請求先・明細・備考などを入力します。"
          />
          <StepCard
            step="3"
            title="PDFで確認"
            text="編集画面のプレビューで見た目を確認し、そのまま保存・発行へ進めます。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>よくある用途</h2>

        <div style={grid2}>
          <ExampleCard
            title="請求書"
            text="月次の請求、単発案件の請求、役務提供の請求など、一般的な請求業務に。"
          />
          <ExampleCard
            title="見積書"
            text="受注前の見積提示、提案段階の金額提示、簡易な条件整理に。"
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
        <h2 style={{ ...sectionTitle, marginTop: 0 }}>まずは standard プロファイルで試す</h2>
        <p
          style={{
            margin: '0 0 14px 0',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4b5563',
          }}
        >
          標準設定でログインすると、新規書類作成時の帳票タイプを standard で始めやすくなります。
          まずはシンプルな請求書・見積書から試したい方に向いています。
        </p>

        <Link
          href="/login?entry=standard&entry_path=/small-business&entry_source=organic"
          style={mainCta}
        >
          標準設定でログインする
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