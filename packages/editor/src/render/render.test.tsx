import type { ReactNode } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RoadieLinkProvider } from '@oztix/roadie-components'

import {
  type EmbedProvider,
  type JSONContent,
  type StoredEditorValue,
  defaultEmbedProviders
} from '../schema'
import { renderEditorHtml, renderEditorValue } from './index'

type Mark = NonNullable<JSONContent['marks']>[number]

function valueOf(...content: JSONContent[]) {
  return { version: 1, preset: 'basic', doc: { type: 'doc', content } }
}

function richValueOf(...content: JSONContent[]) {
  return { version: 1, preset: 'rich', doc: { type: 'doc', content } }
}

function heading(level: unknown, value: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [text(value)] }
}

function text(value: string, ...marks: Mark[]): JSONContent {
  return marks.length > 0
    ? { type: 'text', text: value, marks }
    : { type: 'text', text: value }
}

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', content }
}

function item(...content: JSONContent[]): JSONContent {
  return { type: 'listItem', content: [paragraph(...content)] }
}

function link(href: string): Mark {
  return { type: 'link', attrs: { href } }
}

function cell(
  type: 'tableCell' | 'tableHeader',
  value: string,
  attrs?: object
) {
  return { type, ...(attrs && { attrs }), content: [paragraph(text(value))] }
}

function row(...content: JSONContent[]): JSONContent {
  return { type: 'tableRow', content }
}

function table(...content: JSONContent[]): JSONContent {
  return { type: 'table', content }
}

const th = (value: string, attrs?: object) => cell('tableHeader', value, attrs)
const td = (value: string, attrs?: object) => cell('tableCell', value, attrs)

const bold = { type: 'bold' }
const italic = { type: 'italic' }

// Strips the Prose wrapper and React's text separators, and lowercases
// React's span attribute names, as HTML reads them either way.
function contentOf(html: string) {
  return html
    .replaceAll('<!-- -->', '')
    .replace(/ (col|row)Span=/g, ' $1span=')
    .replaceAll('<br/>', '<br>')
    .replaceAll('<hr/>', '<hr>')
    .replace(/<img([^>]*?)\/>/g, '<img$1>')
    .replace(/^<div[^>]*>/, '')
    .replace(/<\/div>$/, '')
}

const renderers = [
  [
    'renderEditorValue',
    (value: StoredEditorValue) =>
      contentOf(renderToString(renderEditorValue(value)))
  ],
  [
    'renderEditorHtml',
    (value: StoredEditorValue) => contentOf(renderEditorHtml(value))
  ]
] as const

describe.each(renderers)('%s', (_, render) => {
  it.each<[string, JSONContent[], string]>([
    [
      'a paragraph',
      [paragraph(text('Doors open 7pm.'))],
      '<p>Doors open 7pm.</p>'
    ],
    [
      'bold inside italic',
      [paragraph(text('All ', italic), text('ages', italic, bold))],
      '<p><em>All </em><em><strong>ages</strong></em></p>'
    ],
    [
      'underline inside bold',
      [paragraph(text('No refunds', bold, { type: 'underline' }))],
      '<p><strong><u>No refunds</u></strong></p>'
    ],
    [
      'a hard break',
      [
        paragraph(
          text('Gates 11am'),
          { type: 'hardBreak' },
          text('Last entry 7pm')
        )
      ],
      '<p>Gates 11am<br>Last entry 7pm</p>'
    ],
    [
      'a bulleted list',
      [
        { type: 'bulletList', content: [item(text('Bar')), item(text('Food'))] }
      ],
      '<ul><li><p>Bar</p></li><li><p>Food</p></li></ul>'
    ],
    [
      'a numbered list with its start and type',
      [
        {
          type: 'orderedList',
          attrs: { start: 3, type: 'a' },
          content: [item(text('Support act'))]
        }
      ],
      '<ol start="3" type="a"><li><p>Support act</p></li></ol>'
    ],
    [
      'a numbered list from 1, with no start',
      [
        {
          type: 'orderedList',
          attrs: { start: 1, type: null },
          content: [item(text('Headliner'))]
        }
      ],
      '<ol><li><p>Headliner</p></li></ol>'
    ],
    [
      'an internal link',
      [paragraph(text('Tickets', link('/events/123')))],
      '<p><a href="/events/123" data-slot="link" class="link-normal">Tickets</a></p>'
    ],
    [
      'an external link in a new tab',
      [paragraph(text('Map', link('https://example.com/map')))],
      '<p><a href="https://example.com/map" target="_blank" rel="noopener noreferrer" data-slot="link" class="link-normal">Map</a></p>'
    ],
    [
      'a mailto link',
      [paragraph(text('Email us', link('mailto:help@example.com')))],
      '<p><a href="mailto:help@example.com" data-slot="link" class="link-normal">Email us</a></p>'
    ]
  ])('renders %s', (_, content, html) => {
    expect(render(valueOf(...content))).toBe(html)
  })

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['a tab inside javascript:', 'JaVa\tscript:alert(1)'],
    ['a leading control character', '\u0000javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript:', 'vbscript:msgbox(1)']
  ])('drops a link to %s and keeps its text', (_, href) => {
    expect(render(valueOf(paragraph(text('Win', link(href)))))).toBe(
      '<p>Win</p>'
    )
  })

  it.each<[string, JSONContent]>([
    ['an iframe', { type: 'iframe', attrs: { src: 'https://evil.test' } }],
    [
      'raw HTML',
      { type: 'html', attrs: { html: '<img src=x onerror=alert(1)>' } }
    ]
  ])('drops %s', (_, node) => {
    expect(render(valueOf(node, paragraph(text('Kept'))))).toBe('<p>Kept</p>')
  })

  it.each<[string, JSONContent, string]>([
    [
      'a script',
      { type: 'script', content: [text('alert(1)')] },
      '<p>alert(1)</p>'
    ],
    [
      'a heading outside the preset',
      { type: 'heading', attrs: { level: 2 }, content: [text('Lineup')] },
      '<p>Lineup</p>'
    ],
    [
      'a type named after an Object method',
      { type: 'constructor', content: [text('x')] },
      '<p>x</p>'
    ]
  ])('renders only the text of %s, as a paragraph', (_, node, html) => {
    expect(render(valueOf(node, paragraph(text('Kept'))))).toBe(
      `${html}<p>Kept</p>`
    )
  })

  it.each<[string, Mark]>([
    ['an unknown mark', { type: 'spoiler', attrs: { onclick: 'alert(1)' } }],
    ['a mark outside the preset', { type: 'strike' }],
    ['a mark named after an Object method', { type: '__proto__' }]
  ])('renders the text of %s alone', (_, mark) => {
    expect(render(valueOf(paragraph(text('Kept', mark))))).toBe('<p>Kept</p>')
  })

  it('drops attributes the mapping doesn’t read', () => {
    const injected = {
      onclick: 'alert(1)',
      style: 'background:url(javascript:alert(1))',
      class: 'evil',
      target: '_self',
      rel: 'opener'
    }

    expect(
      render(
        valueOf(
          {
            type: 'paragraph',
            attrs: injected,
            content: [text('Hi', { type: 'bold', attrs: injected })]
          },
          {
            type: 'orderedList',
            attrs: { ...injected, start: '1 onclick=x', type: 'disc' },
            content: [item(text('One'))]
          },
          paragraph(
            text('Go', { type: 'link', attrs: { href: '/go', ...injected } })
          )
        )
      )
    ).toBe(
      '<p><strong>Hi</strong></p><ol><li><p>One</p></li></ol><p><a href="/go" data-slot="link" class="link-normal">Go</a></p>'
    )
  })

  it('escapes markup in text and hrefs', () => {
    expect(
      render(
        valueOf(
          paragraph(text('<script>alert(1)</script> & co')),
          paragraph(text('Go', link('/a"><script>x</script>')))
        )
      )
    ).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</p>' +
        '<p><a href="/a&quot;&gt;&lt;script&gt;x&lt;/script&gt;" data-slot="link" class="link-normal">Go</a></p>'
    )
  })

  it.each([
    [
      'an unknown preset',
      { version: 1, preset: 'email', doc: { type: 'doc' } },
      /preset "email"/
    ],
    [
      'a newer version',
      { version: 99, preset: 'basic', doc: { type: 'doc' } },
      /version 99/
    ]
  ])('migrates first, so %s throws', (_, value, error) => {
    expect(() => render(value)).toThrow(error)
  })

  describe('in the rich preset', () => {
    it.each<[string, JSONContent[], string]>([
      [
        'headings 2 to 4',
        [
          heading(2, 'Lineup'),
          heading(3, 'Saturday'),
          heading(4, 'Main stage')
        ],
        '<h2>Lineup</h2><h3>Saturday</h3><h4>Main stage</h4>'
      ],
      [
        'a heading 1 as a heading 2',
        [heading(1, 'Ochre Kite Weekender')],
        '<h2>Ochre Kite Weekender</h2>'
      ],
      [
        'headings 5 and 6 as heading 4',
        [heading(5, 'Bar'), heading(6, 'Food')],
        '<h4>Bar</h4><h4>Food</h4>'
      ],
      [
        'a level that isn’t a number as a heading 2',
        [heading('1 onclick=x', 'Lineup')],
        '<h2>Lineup</h2>'
      ],
      [
        'a quote',
        [
          {
            type: 'blockquote',
            content: [paragraph(text('Best weekend of the year.'))]
          }
        ],
        '<blockquote><p>Best weekend of the year.</p></blockquote>'
      ],
      [
        'a divider',
        [paragraph(text('Doors 7pm')), { type: 'horizontalRule' }],
        '<p>Doors 7pm</p><hr>'
      ],
      [
        'an image, loading lazily, with its alt text',
        [
          {
            type: 'image',
            attrs: {
              src: 'https://assets.example.com/crowd.webp',
              alt: 'The crowd at sunset'
            }
          }
        ],
        '<img src="https://assets.example.com/crowd.webp" alt="The crowd at sunset" loading="lazy">'
      ],
      [
        'an image with no alt text as decorative',
        [{ type: 'image', attrs: { src: '/images/crowd.webp' } }],
        '<img src="/images/crowd.webp" alt="" loading="lazy">'
      ],
      [
        'an image with markup in its alt text, escaped',
        [
          {
            type: 'image',
            attrs: { src: '/images/crowd.webp', alt: '"><script>x</script>' }
          }
        ],
        '<img src="/images/crowd.webp" alt="&quot;&gt;&lt;script&gt;x&lt;/script&gt;" loading="lazy">'
      ],
      [
        'a table with a header row, in a scroller',
        [
          table(
            row(th('Time'), th('Act')),
            row(td('9pm'), td('Ochre Kite')),
            row(td('10pm'), td('Night Parrot'))
          )
        ],
        '<div class="prose-scroll"><table>' +
          '<thead><tr><th><p>Time</p></th><th><p>Act</p></th></tr></thead>' +
          '<tbody><tr><td><p>9pm</p></td><td><p>Ochre Kite</p></td></tr>' +
          '<tr><td><p>10pm</p></td><td><p>Night Parrot</p></td></tr></tbody>' +
          '</table></div>'
      ],
      [
        'a table with no header row, all in its body',
        [table(row(td('9pm'), td('Ochre Kite')))],
        '<div class="prose-scroll"><table><tbody><tr><td><p>9pm</p></td><td><p>Ochre Kite</p></td></tr></tbody></table></div>'
      ],
      [
        'a header column in the body',
        [
          table(
            row(th('9pm'), td('Ochre Kite')),
            row(th('10pm'), td('Night Parrot'))
          )
        ],
        '<div class="prose-scroll"><table><tbody>' +
          '<tr><th><p>9pm</p></th><td><p>Ochre Kite</p></td></tr>' +
          '<tr><th><p>10pm</p></th><td><p>Night Parrot</p></td></tr>' +
          '</tbody></table></div>'
      ],
      [
        'a table of a header row only',
        [table(row(th('Time'), th('Act')))],
        '<div class="prose-scroll"><table><thead><tr><th><p>Time</p></th><th><p>Act</p></th></tr></thead></table></div>'
      ],
      [
        'spans above 1, and no others',
        [
          table(
            row(th('Lineup', { colspan: 2, rowspan: 1 })),
            row(td('9pm', { rowspan: 2 }), td('Ochre Kite')),
            row(td('Night Parrot', { colspan: 1 }))
          )
        ],
        '<div class="prose-scroll"><table>' +
          '<thead><tr><th colspan="2"><p>Lineup</p></th></tr></thead>' +
          '<tbody><tr><td rowspan="2"><p>9pm</p></td><td><p>Ochre Kite</p></td></tr>' +
          '<tr><td><p>Night Parrot</p></td></tr></tbody>' +
          '</table></div>'
      ],
      [
        'a table with no widths or styles from its cells',
        [
          table(
            row({
              type: 'tableCell',
              attrs: {
                colwidth: [200],
                style: 'width:200px',
                class: 'evil',
                align: 'center'
              },
              content: [paragraph(text('9pm'))]
            })
          )
        ],
        '<div class="prose-scroll"><table><tbody><tr><td><p>9pm</p></td></tr></tbody></table></div>'
      ]
    ])('renders %s', (_, content, html) => {
      expect(render(richValueOf(...content))).toBe(html)
    })

    const FRAME =
      'loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; fullscreen; picture-in-picture"'

    it.each<[string, Record<string, unknown>, string]>([
      [
        'a YouTube video at 16:9',
        { provider: 'youtube', id: 'exampleVid1', params: null },
        `<iframe src="https://www.youtube-nocookie.com/embed/exampleVid1" title="YouTube embed exampleVid1" ${FRAME} style="width:100%;border:0;aspect-ratio:16 / 9;max-width:calc(36rem * 16 / 9)"></iframe>`
      ],
      [
        'an unlisted Vimeo video with its hash',
        { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } },
        `<iframe src="https://player.vimeo.com/video/76979871?h=8272103f6e&amp;dnt=1" title="Vimeo embed 76979871" ${FRAME} style="width:100%;border:0;aspect-ratio:16 / 9;max-width:calc(36rem * 16 / 9)"></iframe>`
      ],
      [
        'a Spotify track at its fixed height',
        {
          provider: 'spotify',
          id: 'exampleTrack0000000001',
          params: { type: 'track' }
        },
        `<iframe src="https://open.spotify.com/embed/track/exampleTrack0000000001" title="Spotify embed exampleTrack0000000001" ${FRAME} style="width:100%;border:0;height:352px"></iframe>`
      ],
      [
        'a TikTok video at 9:16, no wider than a phone',
        { provider: 'tiktok', id: '7000000000000000001', params: null },
        `<iframe src="https://www.tiktok.com/player/v1/7000000000000000001" title="TikTok embed 7000000000000000001" ${FRAME} style="width:100%;border:0;aspect-ratio:9 / 16;max-width:calc(36rem * 9 / 16)"></iframe>`
      ]
    ])('renders %s, rebuilding its src', (_, attrs, html) => {
      expect(render(richValueOf({ type: 'embed', attrs }))).toBe(html)
    })

    it.each<[string, Record<string, unknown>]>([
      ['an unknown provider', { provider: 'instagram', id: 'C1a2b3c4d5e' }],
      ['an id that fails its pattern', { provider: 'youtube', id: '../x?a=b' }],
      [
        'a saved src in place of an id',
        { provider: 'youtube', src: 'https://evil.test/' }
      ]
    ])('drops an embed with %s', (_, attrs) => {
      expect(
        render(richValueOf({ type: 'embed', attrs }, paragraph(text('Kept'))))
      ).toBe('<p>Kept</p>')
    })

    it.each([
      ['javascript:', 'javascript:alert(1)'],
      ['http:', 'http://assets.example.com/crowd.webp'],
      ['another site by a protocol-relative URL', '//evil.test/x.webp']
    ])('drops an image on %s', (_, src) => {
      expect(
        render(
          richValueOf(
            { type: 'image', attrs: { src, alt: 'x', onerror: 'alert(1)' } },
            paragraph(text('Kept'))
          )
        )
      ).toBe('<p>Kept</p>')
    })
  })
})

describe.each(renderers)('%s with embedProviders', (name) => {
  const loom: EmbedProvider = {
    name: 'loom',
    label: 'Loom',
    id: /^[0-9a-f]{32}$/,
    aspect: '16:9',
    match: () => null,
    src: ({ id }) => `https://www.loom.com/embed/${id}`
  }
  const id = '0123456789abcdef0123456789abcdef'
  const value = richValueOf({
    type: 'embed',
    attrs: { provider: 'loom', id, params: null }
  })
  const render = (embedProviders?: readonly EmbedProvider[]) =>
    name === 'renderEditorHtml'
      ? renderEditorHtml(value, { embedProviders })
      : renderToString(renderEditorValue(value, { embedProviders }))

  it('renders a provider an app adds', () => {
    expect(render([...defaultEmbedProviders, loom])).toContain(
      `src="https://www.loom.com/embed/${id}" title="Loom embed ${id}"`
    )
  })

  it('drops it with the default providers', () => {
    expect(render()).not.toContain('<iframe')
  })
})

describe('renderEditorValue', () => {
  const value = valueOf(paragraph(text('Tickets', link('/events/123'))))

  it('renders in Prose at a size, with a class', () => {
    const html = renderToString(
      renderEditorValue(value, { size: 'lg', className: 'mt-4' })
    )

    expect(html).toMatch(
      /^<div data-slot="prose"[^>]* class="prose [^"]*text-lg[^"]* mt-4"/
    )
  })

  // React warns about a lowercase `colspan` once per process, so this reads
  // the prop names React was given, which it writes back as is.
  it('gives React a cell’s spans as colSpan and rowSpan', () => {
    const html = renderToString(
      renderEditorValue(
        richValueOf(table(row(th('Lineup', { colspan: 2, rowspan: 3 }))))
      )
    )

    expect(html).toContain('<th colSpan="2" rowSpan="3">')
  })

  it('routes internal links through the Link given to RoadieProvider', () => {
    function RouterLink({
      href,
      children
    }: {
      href: string
      children?: ReactNode
    }) {
      return (
        <a href={href} data-router=''>
          {children}
        </a>
      )
    }

    expect(
      renderToString(
        <RoadieLinkProvider Link={RouterLink}>
          {renderEditorValue(value)}
        </RoadieLinkProvider>
      )
    ).toContain('<a href="/events/123" data-router="">Tickets</a>')
  })
})

describe('renderEditorHtml', () => {
  it('wraps the content in .prose at a size, with a class', () => {
    expect(
      renderEditorHtml(valueOf(paragraph(text('Hi'))), {
        size: 'lg',
        className: 'mt-4" onload="x'
      })
    ).toBe(
      '<div data-slot="prose" class="prose [--prose-size:var(--text-lg)] [--prose-h1-size:var(--text-5xl)] [--prose-h1-weight:900] [--prose-h2-size:var(--text-4xl)] [--prose-h2-weight:700] [--prose-h3-size:var(--text-3xl)] [--prose-h3-weight:700] [--prose-h4-size:var(--text-2xl)] [--prose-h4-weight:700] [--prose-h5-size:var(--text-xl)] [--prose-h5-weight:700] [--prose-h6-size:var(--text-lg)] [--prose-h6-weight:700] mt-4&quot; onload=&quot;x"><p>Hi</p></div>'
    )
  })
})

describe('renderEditorValue with an app’s own blocks', () => {
  const card: JSONContent = {
    type: 'eventCard',
    attrs: { title: 'Ochre Kite Weekender', blockId: 'c1' }
  }
  const value = {
    version: 1,
    preset: 'blocks',
    doc: { type: 'doc', content: [card, paragraph(text('Doors 7pm'))] }
  }
  const nodeMapping = {
    eventCard: ({ attrs }: { attrs: Record<string, unknown> }) => (
      <aside>{String(attrs.title)}</aside>
    )
  }

  it('renders a block through its nodeMapping entry, given its attrs', () => {
    expect(
      contentOf(renderToString(renderEditorValue(value, { nodeMapping })))
    ).toBe('<aside>Ochre Kite Weekender</aside><p>Doors 7pm</p>')
  })

  it('escapes what the entry renders from its attrs', () => {
    const risky = {
      ...value,
      doc: {
        type: 'doc',
        content: [{ type: 'eventCard', attrs: { title: '<img src=x>' } }]
      }
    }

    expect(
      contentOf(renderToString(renderEditorValue(risky, { nodeMapping })))
    ).toBe('<aside>&lt;img src=x&gt;</aside>')
  })

  it('drops a block no entry renders, keeping the rest', () => {
    expect(contentOf(renderToString(renderEditorValue(value)))).toBe(
      '<p>Doors 7pm</p>'
    )
  })

  it('never lets an entry replace one of the preset’s own nodes', () => {
    expect(
      contentOf(
        renderToString(
          renderEditorValue(value, {
            nodeMapping: { ...nodeMapping, paragraph: () => <b>taken</b> }
          })
        )
      )
    ).toBe('<aside>Ochre Kite Weekender</aside><p>Doors 7pm</p>')
  })
})

describe('renderEditorHtml and an app’s own blocks', () => {
  it('drops them, as it takes no nodeMapping', () => {
    const value = {
      version: 1,
      preset: 'blocks',
      doc: {
        type: 'doc',
        content: [{ type: 'eventCard', attrs: { title: 'Ochre Kite' } }]
      }
    }

    expect(contentOf(renderEditorHtml(value))).toBe('<p></p>')
  })
})
