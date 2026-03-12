// lib/pdf/render.ts
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'

async function waitForImages(page: any) {
  await page
    .waitForFunction(
      () => Array.from(document.images).every((img) => (img as any).complete),
      { timeout: 3000 }
    )
    .catch(() => {})

  await page
    .evaluate(async () => {
      const imgs = Array.from(document.images) as any[]
      await Promise.all(imgs.map((img) => img?.decode?.().catch?.(() => {})))
    })
    .catch(() => {})
}

function isVercel() {
  return !!process.env.VERCEL
}

function getChromiumPackBaseUrl() {
  return (
    process.env.CHROMIUM_PACK_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/chromium-pack.tar`
      : undefined)
  )
}

function getChromiumBypassSecret() {
  return (
    process.env.CHROMIUM_PACK_BYPASS_SECRET ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    ''
  ).trim()
}

function withProtectionBypass(rawUrl?: string) {
  if (!rawUrl) return undefined

  const secret = getChromiumBypassSecret()
  if (!secret) return rawUrl

  const url = new URL(rawUrl)
  url.searchParams.set('x-vercel-protection-bypass', secret)
  return url.toString()
}

export async function renderPdfFromHtml(html: string) {
  const onVercel = isVercel()

  const basePackUrl = getChromiumPackBaseUrl()
  const packUrl = withProtectionBypass(basePackUrl)

  const localChrome = process.env.CHROME_EXECUTABLE_PATH
  const executablePath = onVercel
    ? await chromium.executablePath(packUrl)
    : localChrome

  if (!executablePath) {
    throw new Error(
      onVercel
        ? 'Chromium executable not found. Ensure /public/chromium-pack.tar is deployed and CHROMIUM_PACK_URL or VERCEL_URL is available.'
        : 'Missing env CHROME_EXECUTABLE_PATH for local run.'
    )
  }

  const headlessType: any = onVercel ? 'shell' : ('new' as any)

  const browser = await puppeteer.launch({
    executablePath,
    headless: headlessType,
    args: onVercel
      ? puppeteer.defaultArgs({ args: chromium.args, headless: headlessType })
      : ['--no-sandbox', '--disable-setuid-sandbox'],
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