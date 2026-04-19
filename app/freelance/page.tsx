import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function FreelancePage() {
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
            href="/login?entry=creator&entry_path=/freelance&entry_source=organic"
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
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
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
            border: '1px solid #dbeafe',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          フリーランス制作者向け
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
          見積書・請求書を、
          <br />
          制作案件向けにすばやく整える
        </h1>

        <p
          style={{
            margin: '0 0 18px 0',
            fontSize: 15,
            lineHeight: 1.9,
            color: '#4b5563',
            maxWidth: 760,
          }}
        >
          Seikyu Note は、フリーランス制作者向けに
          案件名・納期・納品物・修正回数・利用範囲などの情報を
          請求書や見積書に整理して載せられる請求書作成アプリです。
          会計ソフトほど重くなく、見た目の整ったPDFをすぐ作れます。
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login?entry=creator&entry_path=/freelance&entry_source=organic"
            style={mainCta}
          >
            フリーランス向け設定で始める
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
            title="デザイナー・Web制作者"
            text="案件名、納品物、修正回数などを整理した見積書を作りたい方向けです。"
          />
          <FeatureCard
            title="動画編集者・クリエイター"
            text="制作内容を明細化しながら、提出しやすい請求書PDFを作れます。"
          />
          <FeatureCard
            title="ライター・ディレクター"
            text="案件単位で見積書と請求書を分けて管理したい個人事業主に向いています。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>フリーランス向けで使いやすいポイント</h2>

        <div style={grid2}>
          <InfoCard
            title="案件情報を載せやすい"
            bullets={[
              '案件名',
              '納期',
              '納品物',
              '作業期間',
              '請求対象の明確化',
            ]}
          />
          <InfoCard
            title="制作条件を整理しやすい"
            bullets={[
              '修正回数',
              '利用範囲',
              '権利の扱い',
              '支払条件',
              '源泉徴収欄の拡張余地',
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
            text="フリーランス向け入口からログインすると、初期設定を creator に寄せられます。"
          />
          <StepCard
            step="2"
            title="書類を作成"
            text="見積書または請求書を作成し、案件情報や制作条件を入力します。"
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
            text="LP制作、バナー制作、サイト改修、動画編集、SNSクリエイティブ制作などの案件見積に。"
          />
          <ExampleCard
            title="請求書"
            text="月次の制作費請求、スポット案件の請求、追加修正費の請求などに。"
          />
        </div>
      </section>

      <section
        style={{
          marginTop: 34,
          border: '1px solid #dbeafe',
          borderRadius: 18,
          background: '#f8fbff',
          padding: '22px 20px',
        }}
      >
        <h2 style={{ ...sectionTitle, marginTop: 0 }}>まずは creator プロファイルで試す</h2>
        <p
          style={{
            margin: '0 0 14px 0',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4b5563',
          }}
        >
          フリーランス制作者向けの初期設定でログインすると、
          新規書類作成時の帳票タイプを creator で始めやすくなります。
        </p>

        <Link
          href="/login?entry=creator&entry_path=/freelance&entry_source=organic"
          style={mainCta}
        >
          フリーランス向けでログインする
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