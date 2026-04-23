import Link from 'next/link'

export default function MarketingHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            color: '#111827',
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 0.2,
          }}
        >
          Seikyu Note
        </Link>

        <nav
          aria-label="公開ページナビゲーション"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/pricing"
            style={{
              textDecoration: 'none',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            料金プラン
          </Link>

          <Link
            href="/contact"
            style={{
              textDecoration: 'none',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            お問い合わせ
          </Link>

          <Link
            href="/login"
            style={{
              textDecoration: 'none',
              color: '#111827',
              fontSize: 14,
              fontWeight: 700,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
            }}
          >
            ログイン
          </Link>

          <Link
            href="/login"
            style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#111827',
            }}
          >
            無料で始める
          </Link>
        </nav>
      </div>
    </header>
  )
}