import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

export const alt = 'Seikyu Note | 請求書・見積書PDF作成アプリ'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  const font = await readFile(
    join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.ttf')
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #111827 0%, #1f2937 55%, #374151 100%)',
          color: '#ffffff',
          padding: '56px 64px',
          fontFamily: 'Noto Sans JP',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#ffffff',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            S
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            Seikyu Note
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            請求書・見積書
            <br />
            PDF作成アプリ
          </div>

          <div
            style={{
              fontSize: 28,
              color: '#d1d5db',
              lineHeight: 1.5,
            }}
          >
            書類作成、PDFプレビュー、保存、発行まで
            <br />
            シンプルに管理できるWebアプリ
          </div>
        </div>

        <div
          style={{
            fontSize: 22,
            color: '#9ca3af',
          }}
        >
          https://seikyunote.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: font,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
}