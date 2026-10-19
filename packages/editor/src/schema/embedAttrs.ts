/** An embed's saved attrs: never a src, which the renderer rebuilds. */
export type EmbedAttrs = {
  provider: string
  id: string
  params: Record<string, string> | null
}

export function isTextRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((param) => typeof param === 'string')
  )
}

/** An embed's attrs as saved, or `null` when they don't have that shape. */
export function embedAttrs(attrs: unknown): EmbedAttrs | null {
  if (typeof attrs !== 'object' || attrs === null) return null
  const { provider, id, params } = attrs as Record<string, unknown>
  if (typeof provider !== 'string' || typeof id !== 'string') return null
  if (params === undefined || params === null) {
    return { provider, id, params: null }
  }
  return isTextRecord(params) ? { provider, id, params } : null
}
