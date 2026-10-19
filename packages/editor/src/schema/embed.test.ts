import { describe, expect, it } from 'vitest'

import {
  type EmbedProvider,
  defaultEmbedProviders,
  embedShareUrl,
  embedSrc,
  parseEmbedUrl
} from './index'

describe('parseEmbedUrl', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=exampleVid1',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    [
      'https://youtube.com/watch?feature=share&v=exampleVid1',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    [
      'https://m.youtube.com/watch?v=exampleVid1',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    [
      'https://youtu.be/exampleVid1?si=abc',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    [
      'https://www.youtube.com/shorts/aBc_-12345Z',
      { provider: 'youtube', id: 'aBc_-12345Z' }
    ],
    [
      'https://www.youtube.com/embed/exampleVid1',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    [
      'https://www.youtube-nocookie.com/embed/exampleVid1',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    ['http://youtu.be/exampleVid1', { provider: 'youtube', id: 'exampleVid1' }],
    [
      '  https://youtu.be/exampleVid1  ',
      { provider: 'youtube', id: 'exampleVid1' }
    ],
    ['https://vimeo.com/76979871', { provider: 'vimeo', id: '76979871' }],
    [
      'https://vimeo.com/76979871/8272103f6e',
      { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } }
    ],
    [
      'https://player.vimeo.com/video/76979871?h=8272103f6e',
      { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } }
    ],
    [
      'https://open.spotify.com/track/exampleTrack0000000001?si=x',
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      }
    ],
    [
      'https://open.spotify.com/intl-de/album/1DFixLWuPkv3KT3TnV35m3',
      {
        provider: 'spotify',
        id: '1DFixLWuPkv3KT3TnV35m3',
        params: { type: 'album' }
      }
    ],
    [
      'https://open.spotify.com/embed/show/5CfCWKI5pZ28U0uOzXkDHe',
      {
        provider: 'spotify',
        id: '5CfCWKI5pZ28U0uOzXkDHe',
        params: { type: 'show' }
      }
    ],
    [
      'https://www.tiktok.com/@oztix/video/7000000000000000001',
      { provider: 'tiktok', id: '7000000000000000001' }
    ],
    [
      'https://m.tiktok.com/@oztix/video/7000000000000000001?lang=en',
      { provider: 'tiktok', id: '7000000000000000001' }
    ],
    [
      'https://www.tiktok.com/player/v1/7000000000000000001',
      { provider: 'tiktok', id: '7000000000000000001' }
    ]
  ])('reads %s', (url, expected) => {
    expect(parseEmbedUrl(url)).toEqual(expected)
  })

  it.each([
    [
      'a look-alike suffix',
      'https://youtube.com.evil.test/watch?v=exampleVid1'
    ],
    ['a look-alike prefix', 'https://evilyoutube.com/watch?v=exampleVid1'],
    ['an unlisted subdomain', 'https://evil.youtube.com/watch?v=exampleVid1'],
    ['user info', 'https://youtube.com@evil.test/watch?v=exampleVid1'],
    [
      'user info on the real host',
      'https://me@youtube.com/watch?v=exampleVid1'
    ],
    ['a port', 'https://youtube.com:8443/watch?v=exampleVid1'],
    [
      'a javascript: URL',
      'javascript:alert(1)//youtube.com/watch?v=exampleVid1'
    ],
    ['a data: URL', 'data:text/html,youtu.be/exampleVid1'],
    ['an ftp: URL', 'ftp://youtu.be/exampleVid1'],
    ['no scheme', 'youtu.be/exampleVid1'],
    ['not a URL', 'Doors open at 7pm'],
    ['a short YouTube id', 'https://youtu.be/exampleVid'],
    ['a long YouTube id', 'https://youtu.be/exampleVid12'],
    ['a YouTube id with markup', 'https://youtu.be/example"><a'],
    ['a YouTube channel', 'https://www.youtube.com/@oztix'],
    ['a Vimeo hash with markup', 'https://vimeo.com/76979871?h=a"b'],
    ['a Vimeo channel', 'https://vimeo.com/channels/staffpicks'],
    [
      'an unsupported Spotify type',
      'https://open.spotify.com/user/exampleTrack0000000001'
    ],
    ['a short Spotify id', 'https://open.spotify.com/track/exampleT'],
    ['a TikTok profile', 'https://www.tiktok.com/@oztix'],
    ['a TikTok short link', 'https://vm.tiktok.com/ZMabcdef/'],
    ['an Instagram post', 'https://www.instagram.com/p/C1a2b3c4d5e/']
  ])('refuses %s', (_, url) => {
    expect(parseEmbedUrl(url)).toBeNull()
  })
})

describe('embedSrc', () => {
  it.each([
    [
      { provider: 'youtube', id: 'exampleVid1' },
      'https://www.youtube-nocookie.com/embed/exampleVid1'
    ],
    [
      { provider: 'vimeo', id: '76979871' },
      'https://player.vimeo.com/video/76979871?dnt=1'
    ],
    [
      { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } },
      'https://player.vimeo.com/video/76979871?h=8272103f6e&dnt=1'
    ],
    [
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      },
      'https://open.spotify.com/embed/track/exampleTrack0000000001'
    ],
    [
      { provider: 'tiktok', id: '7000000000000000001' },
      'https://www.tiktok.com/player/v1/7000000000000000001'
    ]
  ])('builds the player URL for %o', (value, src) => {
    expect(embedSrc(value)).toBe(src)
  })

  it.each([
    ['an unknown provider', { provider: 'instagram', id: 'C1a2b3c4d5e' }],
    [
      'an id that would break out of the path',
      { provider: 'youtube', id: '../../x?a=b' }
    ],
    ['an id with markup', { provider: 'tiktok', id: '1"><script>' }],
    [
      'a param that would add a query',
      { provider: 'vimeo', id: '76979871', params: { h: 'ab&autoplay=1' } }
    ],
    [
      'a Spotify type outside the list',
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'user' }
      }
    ],
    [
      'a Spotify value with no type',
      { provider: 'spotify', id: 'exampleTrack0000000001' }
    ],
    ['a value from Object.prototype', { provider: 'toString', id: 'x' }]
  ])('refuses %s', (_, value) => {
    expect(embedSrc(value)).toBeNull()
  })
})

describe('embedShareUrl', () => {
  it.each([
    [
      { provider: 'youtube', id: 'exampleVid1' },
      'https://www.youtube.com/watch?v=exampleVid1'
    ],
    [{ provider: 'vimeo', id: '76979871' }, 'https://vimeo.com/76979871'],
    [
      { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } },
      'https://vimeo.com/76979871/8272103f6e'
    ],
    [
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      },
      'https://open.spotify.com/track/exampleTrack0000000001'
    ],
    [
      {
        provider: 'spotify',
        id: '1234567890abcdefABCDEF',
        params: { type: 'episode' }
      },
      'https://open.spotify.com/episode/1234567890abcdefABCDEF'
    ],
    [
      { provider: 'tiktok', id: '7000000000000000001' },
      'https://www.tiktok.com/@_/video/7000000000000000001'
    ]
  ])('gives the share URL for %o, which reads back as it', (value, url) => {
    expect(embedShareUrl(value)).toBe(url)
    expect(parseEmbedUrl(url)).toEqual(value)
  })

  it.each([
    ['an unknown provider', { provider: 'instagram', id: 'C1a2b3c4d5e' }],
    [
      'an id that would break out of the path',
      { provider: 'youtube', id: '../../x?a=b' }
    ],
    [
      'a param that would add to the path',
      { provider: 'vimeo', id: '76979871', params: { h: '../x' } }
    ]
  ])('is empty for %s', (_, value) => {
    expect(embedShareUrl(value)).toBe('')
  })
})

describe('custom providers', () => {
  const loom: EmbedProvider = {
    name: 'loom',
    id: /^[0-9a-f]{32}$/,
    aspect: '16:9',
    match: (url) =>
      url.hostname === 'www.loom.com'
        ? { id: url.pathname.split('/')[2] ?? '' }
        : null,
    src: ({ id }) => `https://www.loom.com/embed/${id}`
  }
  const providers = [...defaultEmbedProviders, loom]
  const id = '0123456789abcdef0123456789abcdef'

  it('has no share URL when the provider gives none', () => {
    expect(embedShareUrl({ provider: 'loom', id }, providers)).toBe('')
  })

  it('reads and rebuilds a URL from a provider an app adds', () => {
    const value = parseEmbedUrl(`https://www.loom.com/share/${id}`, providers)

    expect(value).toEqual({ provider: 'loom', id })
    expect(value && embedSrc(value, providers)).toBe(
      `https://www.loom.com/embed/${id}`
    )
  })

  it('checks an added provider’s id too', () => {
    expect(
      parseEmbedUrl('https://www.loom.com/share/not-an-id', providers)
    ).toBeNull()
  })
})

describe('defaultEmbedProviders', () => {
  it('gives each provider its player shape', () => {
    expect(
      Object.fromEntries(
        defaultEmbedProviders.map(({ name, aspect }) => [name, aspect])
      )
    ).toEqual({
      youtube: '16:9',
      vimeo: '16:9',
      spotify: { height: 352 },
      tiktok: '9:16'
    })
  })
})
