import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminContext } from '@/lib/authz/getAdminContext'
import { InquiryStatusActions } from './InquiryStatusActions'
import { InquiryAdminNoteForm } from './InquiryAdminNoteForm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = {
  params:
    | Promise<{ id: string }>
    | {
        id: string
      }
}

type InquiryRow = {
  id: string
  created_at: string | null
  name: string | null
  email: string | null
  subject: string | null
  message: string | null
  status?: string | null
  admin_note?: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function statusLabel(status: string | null | undefined) {
  if (status === 'in_progress') return '対応中'
  if (status === 'done') return '完了'
  return '未対応'
}

function statusStyle(status: string | null | undefined): React.CSSProperties {
  if (status === 'in_progress') {
    return {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    }
  }

  if (status === 'done') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    }
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
  }
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
}

export default async function AdminInquiryDetailPage({ params }: Props) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  const resolvedParams =
    params && typeof (params as any)?.then === 'function'
      ? await (params as Promise<{ id: string }>)
      : params

  const id = String(resolvedParams.id ?? '').trim()

  if (!id) {
    notFound()
  }

  const { data, error } = await ctx.supabase
    .from('contact_messages')
    .select('id, created_at, name, email, subject, message, status, admin_note')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/admin/inquiries"
            style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
          >
            ← 問い合わせ一覧へ
          </Link>
        </div>

        <section style={cardStyle()}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
            問い合わせ詳細
          </h1>
          <div style={{ color: '#991b1b', lineHeight: 1.8 }}>
            問い合わせの取得に失敗しました。時間をおいて再試行してください。
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            detail: {error.message}
          </div>
        </section>
      </main>
    )
  }

  const inquiry = data as InquiryRow | null

  if (!inquiry) {
    notFound()
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/admin/inquiries"
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
            >
              ← 問い合わせ一覧へ
            </Link>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>
            問い合わせ詳細
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            受信内容の確認ページです。必要に応じてメール返信や内部メモの参照に使います。
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            ...statusStyle(inquiry.status),
          }}
        >
          {statusLabel(inquiry.status)}
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
              件名
            </h2>
            <div style={{ fontSize: 16, lineHeight: 1.8 }}>
              {inquiry.subject || '件名なし'}
            </div>
          </section>

          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
              本文
            </h2>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.9,
                color: '#374151',
                whiteSpace: 'pre-wrap',
              }}
            >
              {inquiry.message || '本文なし'}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
              送信者情報
            </h2>

            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div>
                <strong>名前:</strong> {inquiry.name || '-'}
              </div>
              <div>
                <strong>メール:</strong> {inquiry.email || '-'}
              </div>
              <div>
                <strong>受信日時:</strong> {formatDateTime(inquiry.created_at)}
              </div>
              <div>
                <strong>ID:</strong> {inquiry.id}
              </div>
            </div>

            {inquiry.email ? (
              <div style={{ marginTop: 14 }}>
                <a
                  href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                    `Re: ${inquiry.subject || ''}`
                  )}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#111827',
                    textDecoration: 'none',
                    fontSize: 14,
                  }}
                >
                  メールを作成
                </a>
              </div>
            ) : null}
          </section>

          <section style={cardStyle()}>
            <InquiryStatusActions
              inquiryId={inquiry.id}
              currentStatus={inquiry.status}
            />
          </section>

          <section style={cardStyle()}>
            <InquiryAdminNoteForm
              inquiryId={inquiry.id}
              initialAdminNote={inquiry.admin_note}
            />
          </section>

          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
              運営メモ
            </h2>

            <div style={{ display: 'grid', gap: 10 }}>
              <Link
                href="/admin/inquiries"
                style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
              >
                問い合わせ一覧へ戻る
              </Link>

              <Link
                href="/admin"
                style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
              >
                管理画面トップへ
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}