// lib/pdf/fontCss.ts
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

let cachedCss: string | null = null

function fileToDataUri(filePath: string, mime: string) {
  const buf = fs.readFileSync(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

export function getPdfFontCss() {
  if (cachedCss) return cachedCss

  try {
    const regularPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
    const boldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.ttf')

    const regularDataUri = fileToDataUri(regularPath, 'font/ttf')
    const boldDataUri = fileToDataUri(boldPath, 'font/ttf')

    cachedCss = `
@font-face {
  font-family: 'InvoiceJP';
  src: url('${regularDataUri}') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'InvoiceJP';
  src: url('${boldDataUri}') format('truetype');
  font-weight: 700;
  font-style: normal;
}

html, body {
  font-family:
    'InvoiceJP',
    'Noto Sans JP',
    'Hiragino Kaku Gothic ProN',
    'Hiragino Sans',
    'Yu Gothic',
    'Meiryo',
    sans-serif;
}

body,
table,
thead,
tbody,
tfoot,
tr,
th,
td,
div,
span,
p,
small,
strong,
em,
h1,
h2,
h3,
h4,
h5,
h6,
li,
dt,
dd {
  font-family: inherit;
}
`
    return cachedCss
  } catch (err) {
    console.error('pdf_font_css_failed', err)

    cachedCss = `
html, body {
  font-family:
    'Noto Sans JP',
    'Hiragino Kaku Gothic ProN',
    'Hiragino Sans',
    'Yu Gothic',
    'Meiryo',
    sans-serif;
}

body,
table,
thead,
tbody,
tfoot,
tr,
th,
td,
div,
span,
p,
small,
strong,
em,
h1,
h2,
h3,
h4,
h5,
h6,
li,
dt,
dd {
  font-family: inherit;
}
`
    return cachedCss
  }
}