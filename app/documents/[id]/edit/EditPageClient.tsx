'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Branding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { buildInvoiceViewModel } from '@/lib/pdf/buildInvoiceViewModel'
import EditItemsForm from './ui'
import EditSummaryCard from './EditSummaryCard'
import InvoiceHtmlPreview from './InvoiceHtmlPreview'
import PdfFilesList from './PdfFilesList'
import { DocumentMetaForm, type DocumentMetaDraft } from './DocumentMetaForm'

type Customer = {
  id: string
  name: string
}

type Item = {
  id?: string
  position: number
  description: string | null
  quantity: number
  unit_price_amount: number
}

type CustomerDetail = {
  name?: string | null
  postal_code?: string | null
  address1?: string | null
  address2?: string | null
  email?: string | null
  phone?: string | null
} | null

declare global {
  interface Window {
    __invoicePreviewState?: Record<
      string,
      {
        customer_id?: string | null
        customer_name?: string | null
        customer_honorific?: string | null
        title?: string | null
        notes?: string | null
        due_date?: string | null
        items?: Array<{
          description?: string | null
          quantity?: number | null
          unit_price_amount?: number | null
          line_subtotal_amount?: number | null
        }>
      }
    >
  }
}

function getDueDateLabel(docType?: string | null) {
  const v = String(docType ?? '').toLowerCase()
  return v === 'quote' || v === 'quotation' ? '有効期限' : '支払期日'
}

function SectionHeading({
  title,
  description,
  right,
}: {
  title: string
  description?: string
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
            marginBottom: description ? 4 : 0,
          }}
        >
          {title}
        </div>

        {description ? (
          <div
            style={{
              fontSize: 12,
              color: '#6b7280',
              lineHeight: 1.6,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      {right ? <div>{right}</div> : null}
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#fff',
        padding: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </section>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: '#6b7280',
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: 999,
        padding: '4px 10px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {count}件
    </div>
  )
}

export default function EditPageClient({
  documentId,
  documentNo,
  docType,
  issuedAt,
  currency,
  customers,
  initialMeta,
  initialItems,
  initialBranding,
  initialCustomerDetail,
}: {
  documentId: string
  documentNo: string
  docType?: string | null
  issuedAt?: string | null
  currency: string
  customers: Customer[]
  initialMeta: DocumentMetaDraft
  initialItems: Item[]
  initialBranding: Branding
  initialCustomerDetail: CustomerDetail
}) {
  const stableInitialMeta = useMemo<DocumentMetaDraft>(
    () => ({
      customer_id: initialMeta.customer_id ?? null,
      customer_name: initialMeta.customer_name ?? null,
      customer_honorific: initialMeta.customer_honorific ?? null,
      title: initialMeta.title ?? null,
      notes: initialMeta.notes ?? null,
      due_date: initialMeta.due_date ?? null,
    }),
    [
      initialMeta.customer_id,
      initialMeta.customer_name,
      initialMeta.customer_honorific,
      initialMeta.title,
      initialMeta.notes,
      initialMeta.due_date,
    ]
  )

  const stableInitialItems = useMemo<Item[]>(
    () =>
      (initialItems ?? []).map((it, idx) => ({
        id: it.id,
        position: it.position ?? idx + 1,
        description: it.description ?? '',
        quantity: Number(it.quantity ?? 0),
        unit_price_amount: Number(it.unit_price_amount ?? 0),
      })),
    [initialItems]
  )

  const [metaDraft, setMetaDraft] = useState<DocumentMetaDraft>(stableInitialMeta)
  const [itemsDraft, setItemsDraft] = useState<Item[]>(stableInitialItems)

  const itemCount = itemsDraft.length
  const dueDateLabel = getDueDateLabel(docType)
  const previewPayload = useMemo(() => {
    return {
      customer_id: metaDraft.customer_id ?? null,
      customer_name: metaDraft.customer_name ?? '',
      customer_honorific: metaDraft.customer_honorific ?? '',
      title: metaDraft.title ?? '',
      notes: metaDraft.notes ?? '',
      due_date: metaDraft.due_date ?? '',
      items: itemsDraft.map((it) => ({
        description: it.description ?? '',
        quantity: Number(it.quantity ?? 0),
        unit_price_amount: Number(it.unit_price_amount ?? 0),
        line_subtotal_amount:
          Number(it.quantity ?? 0) * Number(it.unit_price_amount ?? 0),
      })),
    }
  }, [metaDraft, itemsDraft])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.__invoicePreviewState) {
      window.__invoicePreviewState = {}
    }
    window.__invoicePreviewState[documentId] = previewPayload

    return () => {
      if (window.__invoicePreviewState) {
        delete window.__invoicePreviewState[documentId]
      }
    }
  }, [documentId, previewPayload])

  const liveViewModel = useMemo(() => {
    return buildInvoiceViewModel({
      doc: {
        id: documentId,
        doc_type: docType ?? '',
        customer_name: metaDraft.customer_name ?? '',
        customer_honorific: metaDraft.customer_honorific ?? '',
        currency,
        document_no: documentNo,
        issued_at: issuedAt ?? '',
        title: metaDraft.title ?? '',
        notes: metaDraft.notes ?? '',
        due_date: metaDraft.due_date ?? '',
      },
      customer: {
        name: initialCustomerDetail?.name ?? '',
        postal_code: initialCustomerDetail?.postal_code ?? '',
        address1: initialCustomerDetail?.address1 ?? '',
        address2: initialCustomerDetail?.address2 ?? '',
        email: initialCustomerDetail?.email ?? '',
        phone: initialCustomerDetail?.phone ?? '',
      },
      items: itemsDraft.map((it) => ({
        description: it.description ?? '',
        quantity: Number(it.quantity ?? 0),
        unit_price_amount: Number(it.unit_price_amount ?? 0),
        line_subtotal_amount:
          Number(it.quantity ?? 0) * Number(it.unit_price_amount ?? 0),
      })),
      branding: initialBranding,
    })
  }, [
    documentId,
    docType,
    metaDraft,
    currency,
    documentNo,
    issuedAt,
    itemsDraft,
    initialBranding,
    initialCustomerDetail,
  ])

  const [previewHtml, setPreviewHtml] = useState(() =>
    buildInvoiceHtml(liveViewModel)
  )
  const previewTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current)
    }

    previewTimerRef.current = window.setTimeout(() => {
      setPreviewHtml(buildInvoiceHtml(liveViewModel))
    }, 350)

    return () => {
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current)
      }
    }
  }, [liveViewModel])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <div style={{ minWidth: 0, display: 'grid', gap: 16 }}>
        <div
          style={{
            padding: '14px 16px',
            border: '1px solid #dbeafe',
            borderRadius: 12,
            background: '#f8fbff',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: 8,
            }}
          >
            最初に入力する項目
          </div>

          <div
            style={{
              fontSize: 13,
              color: '#4b5563',
              lineHeight: 1.7,
            }}
          >
            1. 請求先を選択または入力
            <br />
            2. 帳票タイトルを確認
            <br />
            3. {dueDateLabel} を設定
            <br />
            4. 明細を追加して保存
          </div>
        </div>

        <SectionCard>
          <SectionHeading
            title="書類情報"
            description="請求先、帳票タイトル、備考、支払期日または有効期限を設定します。"
          />
          <DocumentMetaForm
           documentId={documentId}
           customers={customers}
           initial={stableInitialMeta}
           onDraftChange={setMetaDraft}
           docType={docType}
          />
        </SectionCard>

        <SectionCard>
          <SectionHeading
            title="明細"
            description="品目・数量・単価を入力して、書類に表示する内容を作成します。"
            right={<CountBadge count={itemCount} />}
          />

          {itemCount === 0 && (
            <div
              style={{
                marginBottom: 14,
                padding: '12px 14px',
                border: '1px dashed #cbd5e1',
                borderRadius: 12,
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 6,
                }}
              >
                まずは最初の1行を追加してください
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.7,
                }}
              >
                明細には、商品名や作業内容、数量、単価を入力します。
                <br />
                例）デザイン制作 / 1 / 50,000
              </div>
            </div>
          )}

          {itemCount > 0 && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fafafa',
                fontSize: 12,
                color: '#6b7280',
                lineHeight: 1.6,
              }}
            >
              明細は現在 <b style={{ color: '#111827' }}>{itemCount}件</b> 入力されています。必要に応じて追加・修正してください。
            </div>
          )}

          <EditItemsForm
            documentId={documentId}
            initialItems={stableInitialItems}
            onItemsChange={setItemsDraft}
          />
        </SectionCard>

        <SectionCard>
          <SectionHeading
            title="プレビュー"
            description="現在の入力内容をもとに、PDFレイアウトを確認できます。"
          />
          <InvoiceHtmlPreview html={previewHtml} />
        </SectionCard>

        <PdfFilesList documentId={documentId} />
      </div>

      <EditSummaryCard
        documentId={documentId}
        documentNo={documentNo}
        docType={String(docType ?? '')}
        currency={liveViewModel.currency}
        title={String(metaDraft.title ?? '')}
        dueDate={String(metaDraft.due_date ?? '')}
        customerName={String(metaDraft.customer_name ?? '')}
        honorific={String(metaDraft.customer_honorific ?? '')}
        itemCount={itemCount}
        subtotal={liveViewModel.totals.subtotal}
        tax={liveViewModel.totals.tax}
        total={liveViewModel.totals.total}
      />
    </div>
  )
}