import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'フリーランス向け請求書の作り方｜必要な項目と書き方を解説 | Seikyu Note',
  description:
    'フリーランスが請求書を作るときに必要な項目、書き方、明細例、PDFで送る前のチェックポイントをわかりやすく解説します。',
  alternates: {
    canonical: '/blog/freelance-invoice-how-to',
  },
}

const mainItems = [
  '請求書のタイトル',
  '請求書番号',
  '発行日',
  '請求先の会社名・氏名',
  '自分の屋号・氏名・住所・連絡先',
  '案件名・取引内容',
  '数量・単価・金額',
  '小計・消費税・合計金額',
  '支払期日',
  '振込先',
  '備考欄',
]

const usefulItems = [
  '案件名',
  '作業期間',
  '納品日',
  '支払条件',
  '源泉徴収の有無',
  '修正対応や追加作業の扱い',
]

const checkItems = [
  '請求先の名称は正しいか',
  '請求金額に誤りはないか',
  '支払期日は入っているか',
  '振込先は正しいか',
  '案件名・作業内容は分かりやすいか',
  'PDFの表示崩れがないか',
  'メール本文に請求書添付の案内を書いたか',
]

const examples = [
  {
    title: 'Web制作案件',
    items: ['トップページデザイン作成', '下層ページデザイン作成', 'コーディング', '公開準備'],
  },
  {
    title: 'デザイン案件',
    items: ['ロゴデザイン制作', 'バナー制作', 'SNS投稿画像制作', '修正対応'],
  },
  {
    title: 'ライティング案件',
    items: ['記事構成作成', '本文執筆', '校正対応', '画像選定'],
  },
  {
    title: '動画編集案件',
    items: ['動画編集', 'テロップ挿入', 'サムネイル制作', 'ショート動画書き出し'],
  },
]

const faqItems = [
  {
    question: 'フリーランスの請求書はExcelで作ってもよいですか？',
    answer:
      'Excelやスプレッドシートで作成することもできます。ただし、PDF化や過去の書類管理に手間がかかる場合は、請求書作成アプリを使うと管理しやすくなります。',
  },
  {
    question: '請求書はPDFで送ってもよいですか？',
    answer:
      '多くの取引ではPDFで送付されています。送付前に、金額・宛名・振込先・支払期日が正しいか確認しておくと安心です。',
  },
  {
    question: '請求書番号は必ず必要ですか？',
    answer:
      '法律上すべてのケースで必須とは限りませんが、管理しやすくするために番号を付けておくと便利です。',
  },
  {
    question: '屋号がない場合は個人名でもよいですか？',
    answer:
      '屋号がない場合は、個人名で請求書を作成できます。取引先に伝えている名前と一致するように記載すると分かりやすいです。',
  },
  {
    question: '請求書に印鑑は必要ですか？',
    answer:
      '取引先のルールによって求められる場合があります。必要かどうかは、事前に取引先へ確認しておくと安心です。',
  },
]

export default function FreelanceInvoiceHowToPage() {
  return (
    <main style={page}>
      <div style={topNav}>
        <Link href="/" style={topLink}>
          ← トップへ戻る
        </Link>
        <Link href="/freelance" style={topLink}>
          フリーランス向けページを見る
        </Link>
      </div>

      <article style={article}>
        <header style={hero}>
          <div style={badge}>フリーランス向け請求書ガイド</div>

          <h1 style={h1}>
            フリーランス向け請求書の作り方
            <br />
            必要な項目と書き方をわかりやすく解説
          </h1>

          <p style={lead}>
            フリーランスとして仕事を受けたあと、報酬を請求するためには請求書を作成する必要があります。
            この記事では、初めて請求書を作る方に向けて、必要な項目、明細の書き方、
            送付前のチェックポイントをわかりやすく解説します。
          </p>

          <div style={ctaRow}>
            <Link href="/freelance" style={mainCta}>
              フリーランス向けページを見る
            </Link>
            <Link
              href="/login?entry=creator&entry_path=/blog/freelance-invoice-how-to&entry_source=blog"
              style={ghostCta}
            >
              無料で請求書を作成する
            </Link>
          </div>
        </header>

        <Section title="フリーランスに請求書は必要？">
          <p style={paragraph}>
            請求書は、取引先に対して「どの仕事に対して、いくらを、いつまでに支払ってほしいか」を伝えるための書類です。
            口頭やチャットだけで済ませると、金額や支払期日の認識違いが起きることがあります。
          </p>
          <p style={paragraph}>
            見積書は仕事を始める前に金額や条件を提示する書類、請求書は仕事が完了したあとに報酬を請求する書類です。
            フリーランスの場合も、案件ごとに請求書を作成しておくと、取引先とのやり取りや自分の管理がしやすくなります。
          </p>
        </Section>

        <Section title="フリーランスの請求書に記載する主な項目">
          <p style={paragraph}>
            請求書には、請求先、発行日、請求金額、支払期日、振込先などを分かりやすく記載します。
            まずは以下の項目を入れておくと、基本的な請求書として整えやすくなります。
          </p>

          <div style={grid2}>
            {mainItems.map((item) => (
              <div key={item} style={miniCard}>
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section title="フリーランスの請求書に入れておくと便利な項目">
          <p style={paragraph}>
            Web制作、デザイン、ライティング、動画編集などの制作案件では、
            「何に対する請求なのか」が取引先に伝わるようにしておくことが大切です。
          </p>

          <div style={grid2}>
            {usefulItems.map((item) => (
              <div key={item} style={miniCard}>
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Web制作・デザイン・ライティング案件の明細例">
          <p style={paragraph}>
            明細は、作業内容ごとに分けると分かりやすくなります。
            たとえば、以下のような形で案件内容を整理できます。
          </p>

          <div style={grid2}>
            {examples.map((example) => (
              <div key={example.title} style={card}>
                <h3 style={h3}>{example.title}</h3>
                <ul style={list}>
                  {example.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="請求書を作るときの注意点">
          <div style={card}>
            <ul style={list}>
              <li>金額・消費税・源泉徴収の扱いを確認する</li>
              <li>支払期日を明記する</li>
              <li>振込先情報に誤りがないか確認する</li>
              <li>請求先の宛名を間違えない</li>
              <li>見積書と請求書の金額がずれていないか確認する</li>
              <li>インボイス制度に関係する場合は、必要な記載項目を確認する</li>
            </ul>
          </div>

          <p style={note}>
            税務やインボイス制度に関する判断が必要な場合は、国税庁などの公的情報や税理士などの専門家に確認してください。
          </p>
        </Section>

        <Section title="請求書PDFを送る前のチェックリスト">
          <div style={grid2}>
            {checkItems.map((item) => (
              <div key={item} style={checkCard}>
                <span style={checkMark}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="フリーランスが請求書をPDFで作成するメリット">
          <div style={grid2}>
            <InfoCard title="取引先に送付しやすい" text="メールやチャットに添付しやすく、確認してもらいやすい形式です。" />
            <InfoCard title="表示崩れを防ぎやすい" text="PDFにしておくと、相手の環境によるレイアウト崩れを防ぎやすくなります。" />
            <InfoCard title="控えとして保存しやすい" text="案件ごとに保存しておくことで、あとから請求内容を確認しやすくなります。" />
            <InfoCard title="案件ごとに管理しやすい" text="見積書・請求書を案件単位で整理しておくと、取引の履歴を追いやすくなります。" />
          </div>
        </Section>

        <Section title="Seikyu Noteでフリーランス向け請求書を作成する流れ">
          <div style={steps}>
            <Step number="1" title="無料登録する" text="フリーランス向けページから無料で始められます。" />
            <Step number="2" title="顧客情報を登録する" text="取引先情報を登録しておくと、次回以降の作成が楽になります。" />
            <Step number="3" title="請求書を作成する" text="案件名、作業内容、数量、単価、金額などを入力します。" />
            <Step number="4" title="PDFで確認する" text="送付前にPDFプレビューで見た目を確認できます。" />
          </div>

          <div style={bottomCta}>
            <h2 style={{ ...h2, marginTop: 0 }}>フリーランス向け請求書を作成するなら</h2>
            <p style={paragraph}>
              Seikyu Note は、Web制作・デザイン・ライティング・動画編集などの制作案件に使いやすい、
              シンプルな請求書・見積書作成アプリです。
            </p>
            <div style={ctaRow}>
              <Link href="/freelance" style={mainCta}>
                フリーランス向けページを見る
              </Link>
              <Link
                href="/login?entry=creator&entry_path=/blog/freelance-invoice-how-to&entry_source=blog"
                style={ghostCta}
              >
                無料で始める
              </Link>
            </div>
          </div>
        </Section>

        <Section title="よくある質問">
          <div style={grid2}>
            {faqItems.map((faq) => (
              <div key={faq.question} style={card}>
                <h3 style={h3}>Q. {faq.question}</h3>
                <p style={{ ...paragraph, marginBottom: 0 }}>A. {faq.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      </article>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={section}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  )
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={card}>
      <h3 style={h3}>{title}</h3>
      <p style={{ ...paragraph, marginBottom: 0 }}>{text}</p>
    </div>
  )
}

function Step({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div style={stepCard}>
      <div style={stepNumber}>{number}</div>
      <div>
        <h3 style={h3}>{title}</h3>
        <p style={{ ...paragraph, marginBottom: 0 }}>{text}</p>
      </div>
    </div>
  )
}

const page: CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '40px 16px 72px',
  fontFamily: 'sans-serif',
  color: '#111827',
}

const topNav: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 20,
}

const topLink: CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
}

const article: CSSProperties = {
  display: 'block',
}

const hero: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
  padding: '28px 24px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
}

const badge: CSSProperties = {
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
}

const h1: CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 34,
  lineHeight: 1.3,
  fontWeight: 800,
  letterSpacing: '-0.02em',
}

const lead: CSSProperties = {
  margin: '0 0 18px 0',
  fontSize: 15,
  lineHeight: 1.9,
  color: '#4b5563',
  maxWidth: 820,
}

const section: CSSProperties = {
  marginTop: 34,
}

const h2: CSSProperties = {
  margin: '0 0 14px 0',
  fontSize: 24,
  lineHeight: 1.4,
  fontWeight: 800,
  color: '#111827',
}

const h3: CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: 17,
  lineHeight: 1.5,
  fontWeight: 800,
  color: '#111827',
}

const paragraph: CSSProperties = {
  margin: '0 0 14px 0',
  fontSize: 15,
  lineHeight: 1.9,
  color: '#4b5563',
}

const note: CSSProperties = {
  margin: '12px 0 0 0',
  fontSize: 13,
  lineHeight: 1.8,
  color: '#6b7280',
}

const grid2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
}

const card: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fff',
  padding: 18,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

const miniCard: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#374151',
}

const checkCard: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  padding: '12px 14px',
  fontSize: 14,
  lineHeight: 1.7,
  color: '#374151',
}

const checkMark: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  background: '#111827',
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  flex: '0 0 auto',
  marginTop: 1,
}

const list: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: '#374151',
  lineHeight: 1.9,
  fontSize: 14,
}

const steps: CSSProperties = {
  display: 'grid',
  gap: 14,
}

const stepCard: CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'flex-start',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fff',
  padding: 18,
}

const stepNumber: CSSProperties = {
  display: 'inline-flex',
  width: 28,
  height: 28,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: '#111827',
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  flex: '0 0 auto',
}

const ctaRow: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const mainCta: CSSProperties = {
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

const ghostCta: CSSProperties = {
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

const bottomCta: CSSProperties = {
  marginTop: 22,
  border: '1px solid #dbeafe',
  borderRadius: 18,
  background: '#f8fbff',
  padding: '22px 20px',
}