// lib/debug.ts
export const isProd = process.env.VERCEL_ENV === 'production'
export const isDebug = !isProd // local / preview は true

export function withDebug<T extends object>(debugObj: T) {
  return isDebug ? debugObj : {}
}