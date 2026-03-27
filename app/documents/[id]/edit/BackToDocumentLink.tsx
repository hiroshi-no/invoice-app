'use client'

import Link from 'next/link'

export default function BackToDocumentLink({
  documentId,
}: {
  documentId: string
}) {
  const hasUnsavedChanges = () => {
    if (typeof window === 'undefined') return false

    const metaDirty =
      localStorage.getItem(`invoice:doc:${documentId}:meta_dirty`) === '1'

    const itemsDirty =
      localStorage.getItem(`invoice:doc:${documentId}:items_dirty`) === '1'

    return metaDirty || itemsDirty
  }

  return (
    <Link
      href={`/documents/${documentId}`}
      onClick={(e) => {
        if (!hasUnsavedChanges()) return

        const ok = window.confirm('未保存の変更があります。このまま戻りますか？')
        if (!ok) e.preventDefault()
      }}
    >
      戻る
    </Link>
  )
}