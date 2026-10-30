/** What an embed saves: never a URL, so a player's URL can change without a migration. */
export type EmbedValue = {
  provider: string
  id: string
  params?: Record<string, string>
}

/** A ratio such as `'16:9'`, or a fixed height in pixels at any width. */
export type EmbedAspect = `${number}:${number}` | { height: number }

export type EmbedProvider = {
  name: string
  /** The provider's name for people, which titles its player. @default name */
  label?: string
  /** The whole id must match before `src` sees it. */
  id: RegExp
  /**
   * The params `src` may read, each with the pattern its whole value must
   * match. A missing param is checked as `''`, so a pattern refusing `''`
   * makes it required. Other params are dropped.
   */
  params?: Record<string, RegExp>
  aspect: EmbedAspect
  /** Reads a share URL, whose host the provider must check exactly. */
  match: (url: URL) => Omit<EmbedValue, 'provider'> | null
  /** Builds the player URL from a value whose id and params passed their patterns. */
  src: (value: EmbedValue) => string
  /** Builds a share URL that `match` reads back, from a value that passed its patterns. */
  shareUrl?: (value: EmbedValue) => string
}

function segments(url: URL) {
  return url.pathname.split('/').filter(Boolean)
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com'
])

const youtube: EmbedProvider = {
  name: 'youtube',
  label: 'YouTube',
  id: /^[\w-]{11}$/,
  aspect: '16:9',
  match(url) {
    if (url.hostname === 'youtu.be') return { id: url.pathname.slice(1) }
    if (!YOUTUBE_HOSTS.has(url.hostname)) return null
    if (url.pathname === '/watch')
      return { id: url.searchParams.get('v') ?? '' }
    const [kind, id = ''] = segments(url)
    return kind === 'shorts' || kind === 'embed' ? { id } : null
  },
  src: ({ id }) => `https://www.youtube-nocookie.com/embed/${id}`,
  shareUrl: ({ id }) => `https://www.youtube.com/watch?v=${id}`
}

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com'])

function vimeoPath(url: URL) {
  if (VIMEO_HOSTS.has(url.hostname)) return segments(url)
  if (url.hostname !== 'player.vimeo.com') return null
  const [kind, ...rest] = segments(url)
  return kind === 'video' ? rest : null
}

const vimeo: EmbedProvider = {
  name: 'vimeo',
  label: 'Vimeo',
  id: /^\d{1,20}$/,
  params: { h: /^[\da-f]{0,32}$/ },
  aspect: '16:9',
  match(url) {
    const path = vimeoPath(url)
    if (!path || path.length === 0 || path.length > 2) return null
    const [id = '', h = url.searchParams.get('h')] = path
    return h ? { id, params: { h } } : { id }
  },
  src: ({ id, params }) =>
    `https://player.vimeo.com/video/${id}?${params?.h ? `h=${params.h}&` : ''}dnt=1`,
  shareUrl: ({ id, params }) =>
    `https://vimeo.com/${id}${params?.h ? `/${params.h}` : ''}`
}

const spotify: EmbedProvider = {
  name: 'spotify',
  label: 'Spotify',
  id: /^[\dA-Za-z]{22}$/,
  params: { type: /^(?:track|album|playlist|artist|episode|show)$/ },
  aspect: { height: 352 },
  match(url) {
    if (url.hostname !== 'open.spotify.com') return null
    const path = segments(url)
    if (path[0] === 'embed' || path[0]?.startsWith('intl-')) path.shift()
    if (path.length !== 2) return null
    const [type = '', id = ''] = path
    return { id, params: { type } }
  },
  src: ({ id, params }) =>
    `https://open.spotify.com/embed/${params?.type}/${id}`,
  shareUrl: ({ id, params }) => `https://open.spotify.com/${params?.type}/${id}`
}

const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'])

const tiktok: EmbedProvider = {
  name: 'tiktok',
  label: 'TikTok',
  id: /^\d{1,32}$/,
  // TikTok doesn't document its player's shape; 9:16 is its video's.
  aspect: '9:16',
  match(url) {
    if (!TIKTOK_HOSTS.has(url.hostname)) return null
    const [first, second, id = ''] = segments(url)
    const isVideo = first?.startsWith('@') && second === 'video'
    const isPlayer = first === 'player' && second === 'v1'
    return isVideo || isPlayer ? { id } : null
  },
  src: ({ id }) => `https://www.tiktok.com/player/v1/${id}`,
  // The value doesn't keep the poster's name, and TikTok finds the video by
  // its id under any name, so a placeholder stands in.
  shareUrl: ({ id }) => `https://www.tiktok.com/@_/video/${id}`
}

const SOUNDCLOUD_HOSTS = new Set([
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com'
])

// First segments that are SoundCloud's own pages, and second segments that
// are an artist's lists, not a track or playlist.
const SOUNDCLOUD_PAGES = new Set([
  'charts',
  'discover',
  'messages',
  'notifications',
  'pages',
  'search',
  'settings',
  'stream',
  'tags',
  'upload',
  'you'
])
const SOUNDCLOUD_LISTS = new Set([
  'albums',
  'comments',
  'followers',
  'following',
  'likes',
  'popular-tracks',
  'reposts',
  'sets',
  'spotlight',
  'tracks'
])

function soundcloudPermalink(url: URL) {
  if (!SOUNDCLOUD_HOSTS.has(url.hostname)) return null
  const path = segments(url)
  const [artist = '', second = ''] = path
  if (SOUNDCLOUD_PAGES.has(artist)) return null
  const isTrack = path.length === 2 && !SOUNDCLOUD_LISTS.has(second)
  const isPlaylist = path.length === 3 && second === 'sets'
  return isTrack || isPlaylist ? path.join('/') : null
}

// A player names its track by API resource, sometimes as a URN.
function soundcloudResource(url: URL) {
  if (url.hostname !== 'api.soundcloud.com') return null
  const [kind = '', ref = ''] = segments(url)
  const [, urnKind = kind, number = ''] =
    /^(?:soundcloud(?::|%3a)(\w+)(?::|%3a))?(\d+)$/i.exec(ref) ?? []
  return urnKind === kind ? `${kind}:${number}` : null
}

// A private track's player won't load without its secret token, which the
// value doesn't keep, so it's refused rather than saved broken.
const isPrivate = (url: URL) => url.searchParams.has('secret_token')

function soundcloudPlayerTrack(url: URL) {
  if (url.hostname !== 'w.soundcloud.com') return null
  if (url.pathname !== '/player' && url.pathname !== '/player/') return null
  const track = webUrl(url.searchParams.get('url') ?? '')
  if (!track || isPrivate(url) || isPrivate(track)) return null
  return soundcloudResource(track) ?? soundcloudPermalink(track)
}

const soundcloudTrackUrl = (id: string) =>
  id.includes(':')
    ? `https://api.soundcloud.com/${id.replace(':', '/')}`
    : `https://soundcloud.com/${id}`

const soundcloudPlayer = (id: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudTrackUrl(id))}`

const soundcloud: EmbedProvider = {
  name: 'soundcloud',
  label: 'SoundCloud',
  // A share link's permalink, which SoundCloud's player resolves, or the API
  // resource an embed code's player names. Permalinks never hold a colon.
  id: /^(?:(?:tracks|playlists):\d{1,20}|[\w-]{1,100}\/(?:sets\/)?[\w-]{1,255})$/,
  aspect: { height: 166 },
  match(url) {
    const id = soundcloudPermalink(url) ?? soundcloudPlayerTrack(url)
    return id ? { id } : null
  },
  src: ({ id }) => soundcloudPlayer(id),
  // An API resource has no page of its own, so its player stands in.
  shareUrl: ({ id }) =>
    id.includes(':') ? soundcloudPlayer(id) : soundcloudTrackUrl(id)
}

const DEEZER_HOSTS = new Set(['deezer.com', 'www.deezer.com'])

function deezerPath(url: URL) {
  const path = segments(url)
  if (url.hostname === 'widget.deezer.com') {
    const [widget, theme = '', ...rest] = path
    return widget === 'widget' && /^(?:auto|dark|light)$/.test(theme)
      ? rest
      : null
  }
  if (!DEEZER_HOSTS.has(url.hostname)) return null
  if (path.length === 3 && /^[a-z]{2}(?:-[a-z]{2})?$/.test(path[0] ?? ''))
    path.shift()
  return path
}

const deezer: EmbedProvider = {
  name: 'deezer',
  label: 'Deezer',
  id: /^\d{1,20}$/,
  params: { type: /^(?:track|album|playlist)$/ },
  aspect: { height: 300 },
  match(url) {
    const path = deezerPath(url)
    if (!path || path.length !== 2) return null
    const [type = '', id = ''] = path
    return { id, params: { type } }
  },
  src: ({ id, params }) =>
    `https://widget.deezer.com/widget/auto/${params?.type}/${id}`,
  shareUrl: ({ id, params }) => `https://www.deezer.com/${params?.type}/${id}`
}

const APPLE_MUSIC_HOSTS = new Set([
  'music.apple.com',
  'embed.music.apple.com',
  'geo.music.apple.com'
])

const appleMusicTrack = (track: string | undefined) =>
  track ? `?i=${track}` : ''

const appleMusic: EmbedProvider = {
  name: 'apple-music',
  label: 'Apple Music',
  id: /^(?:\d{1,20}|pl\.[\w-]{1,64})$/,
  params: {
    type: /^(?:album|playlist|song)$/,
    storefront: /^[a-z]{2}$/,
    track: /^\d{0,20}$/
  },
  aspect: { height: 450 },
  match(url) {
    if (!APPLE_MUSIC_HOSTS.has(url.hostname)) return null
    const path = segments(url)
    // The slug between the type and the id is optional and only for people.
    if (path.length !== 3 && path.length !== 4) return null
    const [storefront = '', type = ''] = path
    const id = path.at(-1) ?? ''
    const params: Record<string, string> = { type, storefront }
    const track = url.searchParams.get('i')
    if (track) params.track = track
    return { id, params }
  },
  src: ({ id, params }) =>
    `https://embed.music.apple.com/${params?.storefront}/${params?.type}/${id}${appleMusicTrack(params?.track)}`,
  shareUrl: ({ id, params }) =>
    `https://music.apple.com/${params?.storefront}/${params?.type}/${id}${appleMusicTrack(params?.track)}`
}

export const defaultEmbedProviders: readonly EmbedProvider[] = [
  youtube,
  vimeo,
  spotify,
  tiktok,
  soundcloud,
  deezer,
  appleMusic
]

function checked(
  provider: EmbedProvider,
  { id, params = {} }: Omit<EmbedValue, 'provider'>
): EmbedValue | null {
  if (!provider.id.test(id)) return null
  const kept: Record<string, string> = {}
  for (const [key, pattern] of Object.entries(provider.params ?? {})) {
    const param = Object.hasOwn(params, key) ? params[key] : undefined
    if (!pattern.test(param ?? '')) return null
    if (param) kept[key] = param
  }
  return Object.keys(kept).length > 0
    ? { provider: provider.name, id, params: kept }
    : { provider: provider.name, id }
}

function webUrl(input: string) {
  try {
    const url = new URL(input.trim())
    const isWeb = url.protocol === 'https:' || url.protocol === 'http:'
    return isWeb && !url.username && !url.password && !url.port ? url : null
  } catch {
    return null
  }
}

/** Reads a pasted share URL into an `EmbedValue`, or `null` if no provider takes it. */
export function parseEmbedUrl(
  input: string,
  providers: readonly EmbedProvider[] = defaultEmbedProviders
): EmbedValue | null {
  const url = webUrl(input)
  if (!url) return null
  for (const provider of providers) {
    const match = provider.match(url)
    const value = match && checked(provider, match)
    if (value) return value
  }
  return null
}

/** The player URL for a saved embed, or `null` if its provider is unknown or its id or params fail their patterns. */
export function embedSrc(
  value: EmbedValue,
  providers: readonly EmbedProvider[] = defaultEmbedProviders
): string | null {
  const provider = providers.find(({ name }) => name === value.provider)
  const safe = provider && checked(provider, value)
  return safe ? provider.src(safe) : null
}

/** A share URL for a saved embed, to edit it from, or `''` if its provider has none or it fails its patterns. */
export function embedShareUrl(
  value: EmbedValue,
  providers: readonly EmbedProvider[] = defaultEmbedProviders
): string {
  const provider = providers.find(({ name }) => name === value.provider)
  const safe = provider && checked(provider, value)
  return (safe && provider.shareUrl?.(safe)) || ''
}
