// lib/pdf/render.ts
import puppeteer from 'puppeteer'

async function waitForImages(page: any) {
  // complete を待つ（失敗しても続行）
  await page
    .waitForFunction(() => Array.from(document.images).every((img) => (img as any).complete), { timeout: 3000 })
    .catch(() => {})

  // decode まで待つ（失敗しても続行）
  await page
    .evaluate(async () => {
      const imgs = Array.from(document.images) as any[]
      await Promise.all(imgs.map((img) => img?.decode?.().catch?.(() => {})))
    })
    .catch(() => {})
}

export async function renderPdfFromHtml(html: string) {
  const browser = await puppeteer.launch({
    headless: 'new' as any,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await waitForImages(page)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })
    return pdf
  } finally {
    await browser.close()
  }
}
