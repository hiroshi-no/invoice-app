import { createHash } from 'node:crypto'

export function stableJson(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`
}

export function computePreviewHash(input: any): string {
  const json = stableJson(input)
  return createHash('sha256').update(json).digest('hex')
}