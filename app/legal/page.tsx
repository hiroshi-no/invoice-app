import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: 'Seikyu Note の特定商取引法に基づく表記です。',
}

export default function LegalPage() {
  return (
    <main style={{ background: '#fff' }}>
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '40px 16px 80px',
          color: '#111827',
          lineHeight: 1.8,
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
          特定商取引法に基づく表記
        </h1>

        <Section title="事業者名">
          <p>【事業者名】</p>
        </Section>

        <Section title="代表者">
          <p>【代表者名】</p>
        </Section>

        <Section title="所在地">
          <p>【郵便番号・住所】</p>
        </Section>

        <Section title="電話番号">
          <p>【電話番号】</p>
          <p>※受付時間：【平日10:00〜17:00】</p>
          <p>※お問い合わせは原則としてメールまたはお問い合わせフォームよりお願いいたします。</p>
        </Section>

        <Section title="メールアドレス">
          <p>【問い合わせメールアドレス】</p>
        </Section>

        <Section title="お問い合わせフォーム">
          <p>https://seikyunote.com/contact</p>
        </Section>

        <Section title="サイトURL">
          <p>https://seikyunote.com</p>
        </Section>

        <Section title="販売価格">
          <p>【各プラン・各商品の価格を税込で記載】</p>
          <p>例：</p>
          <ul>
            <li>フリープラン：0円</li>
            <li>スタンダードプラン：月額【○○円】</li>
            <li>プレミアムプラン：月額【○○円】</li>
          </ul>
        </Section>

        <Section title="商品代金以外の必要料金">
          <ul>
            <li>インターネット接続に必要な通信料等は利用者の負担となります。</li>
            <li>銀行振込を利用する場合、振込手数料は利用者の負担となります。</li>
            <li>その他発生する費用がある場合は【ここに記載】</li>
          </ul>
        </Section>

        <Section title="支払方法">
          <p>【クレジットカード / 銀行振込 / その他】</p>
        </Section>

        <Section title="支払時期">
          <p>【クレジットカード決済の場合は申込時または各更新日に課金】</p>
          <p>【銀行振込の場合は申込後○日以内】</p>
        </Section>

        <Section title="サービス提供時期">
          <p>
            決済完了後、直ちにまたは当方が別途定める時点で利用可能となります。
          </p>
        </Section>

        <Section title="動作環境">
          <p>
            本サービスは、インターネット接続環境および対応ブラウザが必要です。
            推奨環境の詳細は、必要に応じて本サービス上で案内します。
          </p>
        </Section>

        <Section title="申込みの撤回・キャンセル・返金">
          <p>【サブスク型の例】</p>
          <ul>
            <li>
              利用者は、次回更新日前までに所定の方法で解約手続を行うことで、次回以降の更新を停止できます。
            </li>
            <li>
              期間途中で解約した場合でも、当月分または契約期間分の利用料金の日割返金は
              【する / しない】ものとします。
            </li>
            <li>
              法令上認められる場合を除き、決済完了後の返金には応じません。
            </li>
          </ul>

          <p style={{ marginTop: 16 }}>【単発課金型の例】</p>
          <ul>
            <li>
              デジタルサービスの性質上、提供開始後のキャンセル・返金は、法令上認められる場合または
              当方に責めに帰すべき事由がある場合を除き、お受けできません。
            </li>
          </ul>
        </Section>

        <Section title="不良品・契約不適合に関する取扱い">
          <p>
            本サービスに重大な不具合があり、当方の責めに帰すべき事由がある場合は、
            法令および利用規約に従って対応します。
          </p>
        </Section>

        <Section title="表現およびサービスに関する注意書き">
          <p>
            本サービス上の説明、紹介文、ヘルプその他の表示は、一般的な利用を想定したものであり、
            特定目的への適合性、成果、効果等を保証するものではありません。
          </p>
        </Section>

        <Section title="特別条件">
          <p>【期間限定プラン、最低利用期間、更新条件などがあれば記載】</p>
        </Section>

        <section style={{ marginTop: 40 }}>
          <p>制定日：【2026年○月○日】</p>
          <p>最終改定日：【2026年○月○日】</p>
        </section>
      </div>
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
    <section style={{ marginTop: 32 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}