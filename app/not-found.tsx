import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 16px',
        background: '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: '#6b7280',
            background: '#f3f4f6',
            borderRadius: 999,
            padding: '6px 10px',
            marginBottom: 16,
          }}
        >
          404 NOT FOUND
        </div>

        <h1 style={{ fontSize: 32, lineHeight: 1.3, fontWeight: 700, margin: 0 }}>
          ページが見つかりません
        </h1>

        <p style={{ marginTop: 16, color: '#4b5563', lineHeight: 1.8 }}>
          URLが間違っているか、ページが移動または削除された可能性があります。
          トップページ、書類一覧、お問い合わせページから必要なページへ戻ってください。
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
            href="/"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              background: '#111827',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            トップへ戻る
          </Link>

          <Link
            href="/documents"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              background: '#fff',
              color: '#111827',
              padding: '12px 16px',
              borderRadius: 10,
              fontWeight: 600,
              border: '1px solid #d1d5db',
            }}
          >
            書類一覧へ
          </Link>

          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              background: '#fff',
              color: '#111827',
              padding: '12px 16px',
              borderRadius: 10,
              fontWeight: 600,
              border: '1px solid #d1d5db',
            }}
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </main>
  )
}