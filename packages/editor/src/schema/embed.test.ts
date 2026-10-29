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
    ],
    [
      'https://soundcloud.com/forss/flickermood',
      { provider: 'soundcloud', id: 'forss/flickermood' }
    ],
    [
      'https://m.soundcloud.com/forss/flickermood?si=abc&utm_source=clipboard',
      { provider: 'soundcloud', id: 'forss/flickermood' }
    ],
    [
      'https://www.soundcloud.com/forss/sets/soulhack',
      { provider: 'soundcloud', id: 'forss/sets/soulhack' }
    ],
    [
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=false',
      { provider: 'soundcloud', id: 'tracks:293' }
    ],
    [
      'https://w.soundcloud.com/player?url=https://api.soundcloud.com/playlists/18',
      { provider: 'soundcloud', id: 'playlists:18' }
    ],
    [
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A293',
      { provider: 'soundcloud', id: 'tracks:293' }
    ],
    [
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood',
      { provider: 'soundcloud', id: 'forss/flickermood' }
    ],
    [
      'https://www.deezer.com/en/track/3135556',
      { provider: 'deezer', id: '3135556', params: { type: 'track' } }
    ],
    [
      'https://deezer.com/album/302127',
      { provider: 'deezer', id: '302127', params: { type: 'album' } }
    ],
    [
      'https://www.deezer.com/pt-br/playlist/908622995?utm_source=share',
      { provider: 'deezer', id: '908622995', params: { type: 'playlist' } }
    ],
    [
      'https://widget.deezer.com/widget/dark/track/3135556?tracklist=false',
      { provider: 'deezer', id: '3135556', params: { type: 'track' } }
    ],
    [
      'https://music.apple.com/au/album/the-heart-is-a-muscle/1233719556?i=1233720954',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1233720954' }
      }
    ],
    [
      'https://music.apple.com/au/album/go-farther-in-lightness/1233719556',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au' }
      }
    ],
    [
      'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb',
      {
        provider: 'apple-music',
        id: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
        params: { type: 'playlist', storefront: 'us' }
      }
    ],
    [
      'https://music.apple.com/au/playlist/road-trip/pl.u-AbCd123EfGh',
      {
        provider: 'apple-music',
        id: 'pl.u-AbCd123EfGh',
        params: { type: 'playlist', storefront: 'au' }
      }
    ],
    [
      'https://music.apple.com/au/song/the-heart-is-a-muscle/1233720954',
      {
        provider: 'apple-music',
        id: '1233720954',
        params: { type: 'song', storefront: 'au' }
      }
    ],
    [
      'https://embed.music.apple.com/au/album/1233719556?i=1233720954',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1233720954' }
      }
    ],
    [
      'https://geo.music.apple.com/au/album/the-heart-is-a-muscle/1233719556?i=1233720954&ls',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1233720954' }
      }
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
    ['an Instagram post', 'https://www.instagram.com/p/C1a2b3c4d5e/'],
    [
      'a SoundCloud look-alike suffix',
      'https://soundcloud.com.evil.test/forss/flickermood'
    ],
    [
      'a SoundCloud look-alike prefix',
      'https://evilsoundcloud.com/forss/flickermood'
    ],
    ['a SoundCloud short link', 'https://on.soundcloud.com/AbCdE12345'],
    ['a SoundCloud profile', 'https://soundcloud.com/forss'],
    ['a SoundCloud profile’s likes', 'https://soundcloud.com/forss/likes'],
    ['a SoundCloud profile’s playlists', 'https://soundcloud.com/forss/sets'],
    ['a SoundCloud search', 'https://soundcloud.com/search/sounds?q=forss'],
    [
      'a private SoundCloud link',
      'https://soundcloud.com/forss/flickermood/s-AbCdE'
    ],
    [
      'a SoundCloud permalink with markup',
      'https://soundcloud.com/forss/flicker"><a'
    ],
    [
      'a SoundCloud player of another host',
      'https://w.soundcloud.com/player/?url=https%3A//evil.test/tracks/293'
    ],
    [
      'a SoundCloud player of a look-alike API host',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com.evil.test/tracks/293'
    ],
    [
      'a SoundCloud player of a javascript: URL',
      'https://w.soundcloud.com/player/?url=javascript:alert(1)//api.soundcloud.com/tracks/293'
    ],
    [
      'a SoundCloud player of a non-numeric track',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293%22%3E%3Ca'
    ],
    [
      'a SoundCloud player whose URN names another kind',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Aplaylists%253A18'
    ],
    [
      'a SoundCloud player of a user',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/1'
    ],
    [
      'a SoundCloud player inside a player',
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fw.soundcloud.com%2Fplayer%2F%3Furl%3Dhttps%253A%2F%2Fapi.soundcloud.com%2Ftracks%2F293'
    ],
    ['a SoundCloud player with no track', 'https://w.soundcloud.com/player/'],
    [
      'a private SoundCloud player',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293%3Fsecret_token%3Ds-AbCdE&color=%23ff5500'
    ],
    [
      'a private SoundCloud player with its token outside the track',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&secret_token=s-AbCdE'
    ],
    ['a Deezer look-alike', 'https://deezer.com.evil.test/track/3135556'],
    ['a Deezer artist', 'https://www.deezer.com/en/artist/27'],
    ['a Deezer short link', 'https://link.deezer.com/s/30abcdEFgh'],
    ['a Deezer id with markup', 'https://www.deezer.com/track/31"><a'],
    ['a Deezer language with markup', 'https://www.deezer.com/e"n/track/31'],
    [
      'a Deezer artist player',
      'https://widget.deezer.com/widget/dark/artist/27'
    ],
    [
      'an Apple Music look-alike',
      'https://music.apple.com.evil.test/au/album/x/1233719556'
    ],
    [
      'an Apple Music artist',
      'https://music.apple.com/au/artist/gang-of-youths/1012345678'
    ],
    [
      'an Apple Music storefront that isn’t a country',
      'https://music.apple.com/australia/album/x/1233719556'
    ],
    [
      'an Apple Music track with markup',
      'https://music.apple.com/au/album/x/1233719556?i=1%22%3E%3Ca'
    ],
    [
      'an Apple Music playlist id with markup',
      'https://music.apple.com/au/playlist/x/pl.u-"><a'
    ],
    ['an iTunes Store link', 'https://itunes.apple.com/au/album/x/id1233719556']
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
    ],
    [
      { provider: 'soundcloud', id: 'forss/flickermood' },
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood'
    ],
    [
      { provider: 'soundcloud', id: 'forss/sets/soulhack' },
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fsets%2Fsoulhack'
    ],
    [
      { provider: 'soundcloud', id: 'tracks:293' },
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293'
    ],
    [
      { provider: 'deezer', id: '3135556', params: { type: 'track' } },
      'https://widget.deezer.com/widget/auto/track/3135556'
    ],
    [
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1233720954' }
      },
      'https://embed.music.apple.com/au/album/1233719556?i=1233720954'
    ],
    [
      {
        provider: 'apple-music',
        id: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
        params: { type: 'playlist', storefront: 'us' }
      },
      'https://embed.music.apple.com/us/playlist/pl.f4d106fed2bd41149aaacabb233eb5eb'
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
    ['a value from Object.prototype', { provider: 'toString', id: 'x' }],
    [
      'a SoundCloud id that would add a query',
      { provider: 'soundcloud', id: 'forss/x&auto_play=true' }
    ],
    [
      'a SoundCloud id that would climb the path',
      { provider: 'soundcloud', id: '../../tracks/293' }
    ],
    [
      'a SoundCloud id of another API resource',
      { provider: 'soundcloud', id: 'users:1' }
    ],
    [
      'a Deezer type outside the list',
      { provider: 'deezer', id: '27', params: { type: 'artist' } }
    ],
    ['a Deezer value with no type', { provider: 'deezer', id: '3135556' }],
    [
      'an Apple Music storefront that would climb the path',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: '../x' }
      }
    ],
    [
      'an Apple Music value with no storefront',
      { provider: 'apple-music', id: '1233719556', params: { type: 'album' } }
    ],
    [
      'an Apple Music track that would add a query',
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1&app=itunes' }
      }
    ]
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
    ],
    [
      { provider: 'soundcloud', id: 'forss/sets/soulhack' },
      'https://soundcloud.com/forss/sets/soulhack'
    ],
    [
      { provider: 'soundcloud', id: 'playlists:18' },
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F18'
    ],
    [
      { provider: 'deezer', id: '908622995', params: { type: 'playlist' } },
      'https://www.deezer.com/playlist/908622995'
    ],
    [
      {
        provider: 'apple-music',
        id: '1233719556',
        params: { type: 'album', storefront: 'au', track: '1233720954' }
      },
      'https://music.apple.com/au/album/1233719556?i=1233720954'
    ],
    [
      {
        provider: 'apple-music',
        id: 'pl.u-AbCd123EfGh',
        params: { type: 'playlist', storefront: 'au' }
      },
      'https://music.apple.com/au/playlist/pl.u-AbCd123EfGh'
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
      tiktok: '9:16',
      soundcloud: { height: 166 },
      deezer: { height: 300 },
      'apple-music': { height: 450 }
    })
  })
})
