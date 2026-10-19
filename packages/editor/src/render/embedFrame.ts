import {
  type EmbedProvider,
  type EmbedValue,
  defaultEmbedProviders,
  embedSrc
} from '../schema/embed'
import { embedAttrs } from '../schema/embedAttrs'

export const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation'
export const EMBED_ALLOW = 'encrypted-media; fullscreen; picture-in-picture'

export type EmbedFrame = {
  src: string
  title: string
  /** Inline, since a provider an app adds can have any shape. */
  style: Record<string, string>
}

// A ratio player is no taller than this, so a portrait one stays narrow.
const MAX_HEIGHT = '36rem'

function frameStyle({ aspect }: EmbedProvider): Record<string, string> {
  const base = { width: '100%', border: '0' }
  if (typeof aspect === 'object')
    return { ...base, height: `${aspect.height}px` }
  const [width = 16, height = 9] = aspect.split(':').map(Number)
  return {
    ...base,
    aspectRatio: `${width} / ${height}`,
    maxWidth: `calc(${MAX_HEIGHT} * ${width} / ${height})`
  }
}

/** The player for a saved embed, or `null` when no provider rebuilds its src. */
export function embedFrame(
  attrs: unknown,
  providers: readonly EmbedProvider[] = defaultEmbedProviders
): EmbedFrame | null {
  const saved = embedAttrs(attrs)
  if (!saved) return null
  const value: EmbedValue = saved.params
    ? { provider: saved.provider, id: saved.id, params: saved.params }
    : { provider: saved.provider, id: saved.id }
  const src = embedSrc(value, providers)
  const provider = providers.find(({ name }) => name === saved.provider)
  if (!src || !provider) return null
  return {
    src,
    title: `${provider.label ?? provider.name} embed ${saved.id}`,
    style: frameStyle(provider)
  }
}
