import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '内装・小規模工事向け見積書・請求書作成アプリ | Seikyu Note',
  description:
    '内装工事・リフォーム・小規模工事の見積書・請求書作成に。工事名、現場名、工期、材料費、作業費、諸経費などを整理しながら、PDF帳票をかんたんに作成できます。',
  alternates: {
    canonical: '/interior',
  },
}

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
            内装・小規模工事の見積書・請求書を、
            <br />
            現場ごとにすばやくPDF化
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
            Seikyu Note は、内装工事・リフォーム・小規模工事の
            見積書・請求書作成に使いやすい帳票作成アプリです。
            工事名、現場名、工期、材料費、作業費、諸経費、支払条件などを整理しながら、
            見た目の整ったPDFをかんたんに作成できます。
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
  <h2 style={sectionTitle}>工事案件の見積・請求で、こんな手間はありませんか？</h2>

  <div style={grid2}>
    <InfoCard
      title="案件ごとの帳票作成に時間がかかる"
      bullets={[
        '現場ごとに見積書や請求書を毎回作り直している',
        'ExcelやスプレッドシートでPDF化するのが面倒',
        '見積書と請求書の内容を別々に管理している',
      ]}
    />
    <InfoCard
      title="工事項目や条件を整理しにくい"
      bullets={[
        '材料費、作業費、諸経費を分かりやすく分けたい',
        '工期や支払条件を備考欄にきちんと残したい',
        '会計ソフトや施工管理システムほど大きな機能はまだ必要ない',
      ]}
    />
  </div>
</section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>こんな方に向いています</h2>

        <div style={grid3}>
          <FeatureCard
            title="内装工事・リフォーム業の方"
            text="クロス張替え、床工事、塗装、設備交換、店舗内装など、現場ごとの見積書・請求書作成に使えます。"
          />
          <FeatureCard
            title="一人親方・個人事業主の方"
            text="大きな施工管理システムではなく、まずは見積書・請求書PDFをシンプルに作りたい方に向いています。"
          />
          <FeatureCard
            title="小規模工事を受ける事業者"
            text="材料費、作業費、諸経費などを明細に分けて、取引先に提出しやすい帳票を作成できます。"
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>内装・工事向けで使いやすいポイント</h2>

        <div style={grid2}>
          <InfoCard
            title="工事案件ごとに整理しやすい"
            bullets={[
               '工事名',
               '現場名',
               '工事場所',
               '工期',
               '見積有効期限',
             ]}
           />
          <InfoCard
            title="工事項目を明細化しやすい"
            bullets={[
              '材料費',
              '作業費',
              '諸経費',
              '追加工事',
              '値引きや調整項目',
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
           text="工事向け入口からログインすると、内装・小規模工事向けの設定で始めやすくなります。"
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

      <section style={{ marginTop: 28 }}>
  <h2 style={sectionTitle}>サンプル見積書イメージ</h2>

  <div style={sampleBox}>
    <div style={sampleHeader}>
      <div>
        <div style={sampleLabel}>見積書サンプル</div>
        <div style={sampleTitle}>店舗内装工事 お見積書</div>
      </div>
      <div style={sampleAmount}>合計 385,000円</div>
    </div>

    <div style={sampleTable}>
      <div style={sampleRowHead}>
        <span>内容</span>
        <span>金額</span>
      </div>
      <div style={sampleRow}>
        <span>クロス張替え工事</span>
        <span>120,000円</span>
      </div>
      <div style={sampleRow}>
        <span>床材張替え工事</span>
        <span>150,000円</span>
      </div>
      <div style={sampleRow}>
        <span>養生・搬入出作業</span>
        <span>45,000円</span>
      </div>
      <div style={sampleRow}>
        <span>諸経費</span>
        <span>70,000円</span>
      </div>
    </div>

    <p style={sampleNote}>
      備考例：工期はご発注後、日程調整のうえ確定します。
      追加工事が発生する場合は、別途お見積りとなります。
    </p>
  </div>
</section>

<section style={{ marginTop: 28 }}>
  <h2 style={sectionTitle}>大きな施工管理システムまでは必要ない方に</h2>

  <div style={card}>
    <p style={{ ...cardText, margin: 0 }}>
      Seikyu Note は、工程管理や現場写真管理まで行う大規模な施工管理システムではありません。
      まずは、内装・小規模工事の見積書・請求書をすばやく作り、
      PDFで確認・保存したい方向けのシンプルな帳票作成アプリです。
      複雑な機能よりも、日々の工事案件で迷わず使えることを重視しています。
    </p>
  </div>
</section>

<section style={{ marginTop: 28 }}>
  <h2 style={sectionTitle}>よくある質問</h2>

  <div style={grid2}>
    <FaqCard
      question="内装工事の見積書にも使えますか？"
      answer="はい。クロス張替え、床工事、塗装、設備交換、原状回復、店舗内装など、小規模な工事案件の見積書・請求書作成に使えます。"
    />
    <FaqCard
      question="材料費と作業費を分けて入力できますか？"
      answer="はい。明細ごとに内容、数量、単価、金額を入力できるため、材料費・作業費・諸経費などを分けて整理できます。"
    />
    <FaqCard
      question="見積書と請求書の両方を作れますか？"
      answer="はい。案件に応じて見積書・請求書を作成できます。"
    />
    <FaqCard
      question="施工管理機能はありますか？"
      answer="現時点では、見積書・請求書PDFの作成と管理を中心にしたシンプルなアプリです。"
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
        <h2 style={{ ...sectionTitle, marginTop: 0 }}>まずは内装・小規模工事向け設定で試す</h2>
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
          href="/login?entry=interior&entry_path=/interior&entry_source=organic"
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