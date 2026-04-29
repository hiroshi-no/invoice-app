import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'フリーランス制作者向け請求書・見積書作成アプリ | Seikyu Note',
  description:
    'Web制作・デザイン・ライティング・動画編集などの制作案件に。案件名、納品物、作業内容を整理しながら、見積書・請求書PDFをかんたんに作成できます。',
  alternates: {
    canonical: '/freelance',
  },
}

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
        フリーランス制作者の見積書・請求書を、
        <br />
        案件ごとにすばやくPDF化
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
          Seikyu Note は、Web制作・デザイン・ライティング・動画編集などの
          制作案件に使いやすい、見積書・請求書作成アプリです。
          案件名、納品物、作業内容、修正回数、支払条件などを整理しながら、
          見た目の整ったPDFをかんたんに作成できます。
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
  <h2 style={sectionTitle}>制作案件の見積・請求で、こんな手間はありませんか？</h2>

  <div style={grid2}>
    <InfoCard
      title="毎回の作成に時間がかかる"
      bullets={[
        '案件ごとに見積書や請求書を毎回作り直している',
        'ExcelやスプレッドシートでPDF化するのが面倒',
        '請求書番号や発行日、支払期日の管理がばらつく',
      ]}
    />
    <InfoCard
      title="制作条件をどう書くか迷う"
      bullets={[
        '納品物や修正回数をどこに書けばよいか迷う',
        '作業範囲や支払条件を取引先に分かりやすく伝えたい',
        '会計ソフトほど多機能なものはまだ必要ない',
      ]}
    />
  </div>
</section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>こんな方に向いています</h2>

        <div style={grid3}>
          <FeatureCard
            title="Web制作者・ホームページ制作者"
            text="LP制作、コーポレートサイト制作、WordPress構築、サイト改修、保守作業などの見積書・請求書作成に使えます。"
          />
          <FeatureCard
            title="デザイナー・クリエイター"
            text="ロゴ制作、バナー制作、チラシ制作、SNS画像制作など、制作物ごとの明細を整理できます。"
          />
          <FeatureCard
            title="ライター・動画編集者"
            text="記事制作、編集、校正、動画編集、サムネイル制作など、作業内容を分けた請求書作成に向いています。"
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

      <section style={{ marginTop: 28 }}>
  <h2 style={sectionTitle}>サンプル見積書イメージ</h2>

  <div style={sampleBox}>
    <div style={sampleHeader}>
      <div>
        <div style={sampleLabel}>見積書サンプル</div>
        <div style={sampleTitle}>Webサイト制作お見積書</div>
      </div>
      <div style={sampleAmount}>合計 290,000円</div>
    </div>

    <div style={sampleTable}>
      <div style={sampleRowHead}>
        <span>内容</span>
        <span>金額</span>
      </div>
      <div style={sampleRow}>
        <span>トップページデザイン作成</span>
        <span>80,000円</span>
      </div>
      <div style={sampleRow}>
        <span>下層ページデザイン作成</span>
        <span>60,000円</span>
      </div>
      <div style={sampleRow}>
        <span>コーディング</span>
        <span>120,000円</span>
      </div>
      <div style={sampleRow}>
        <span>公開準備</span>
        <span>30,000円</span>
      </div>
    </div>

    <p style={sampleNote}>
      備考例：修正は2回まで含みます。納品物はHTML/CSS一式と画像素材です。
      お支払いは納品月末締め、翌月末払いです。
    </p>
  </div>
</section>

<section style={{ marginTop: 28 }}>
  <h2 style={sectionTitle}>よくある質問</h2>

  <div style={grid2}>
    <FaqCard
      question="フリーランスの請求書にも使えますか？"
      answer="はい。Web制作、デザイン、ライティング、動画編集など、個人で受ける制作案件の請求書・見積書作成に使えます。"
    />
    <FaqCard
      question="見積書と請求書の両方を作れますか？"
      answer="はい。案件に応じて見積書・請求書を作成できます。"
    />
    <FaqCard
      question="PDFで保存できますか？"
      answer="はい。作成した書類はPDFで確認・保存できます。送付前のチェックにも使いやすいです。"
    />
    <FaqCard
      question="会計ソフトとの連携はありますか？"
      answer="現時点では、見積書・請求書PDFの作成と管理を中心にしたシンプルなアプリです。"
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
  <h2 style={{ ...sectionTitle, marginTop: 0 }}>まずはフリーランス制作者向け設定で試す</h2>
  <p
    style={{
      margin: '0 0 14px 0',
      fontSize: 14,
      lineHeight: 1.8,
      color: '#4b5563',
    }}
  >
    Seikyu Note は無料プランから始められます。
    まずは数件の見積書・請求書を作成して、PDFの見た目や操作感を確認できます。
  </p>

  <Link
    href="/login?entry=creator&entry_path=/freelance&entry_source=organic"
    style={mainCta}
  >
    無料で始める
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

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div style={card}>
      <div style={cardTitle}>Q. {question}</div>
      <div style={cardText}>A. {answer}</div>
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

const sampleBox: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 18,
  background: '#ffffff',
  padding: 20,
  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
}

const sampleHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 16,
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: 14,
}

const sampleLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#2563eb',
  marginBottom: 6,
}

const sampleTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: '#111827',
}

const sampleAmount: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: '#111827',
}

const sampleTable: React.CSSProperties = {
  display: 'grid',
  gap: 0,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflow: 'hidden',
}

const sampleRowHead: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 120px',
  gap: 12,
  padding: '10px 12px',
  background: '#f3f4f6',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const sampleRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 120px',
  gap: 12,
  padding: '10px 12px',
  borderTop: '1px solid #e5e7eb',
  fontSize: 14,
  color: '#374151',
}

const sampleNote: React.CSSProperties = {
  margin: '14px 0 0 0',
  fontSize: 13,
  lineHeight: 1.8,
  color: '#4b5563',
}