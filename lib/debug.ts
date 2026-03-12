// lib/debug.ts
export const isDebug = process.env.NODE_ENV !== 'production'

export function withDebug<T extends Record<string, unknown>>(debugObj?: T) {
  if (!isDebug || !debugObj) return {}

  return Object.fromEntries(
    Object.entries(debugObj).filter(([, v]) => v !== undefined)
  )
}