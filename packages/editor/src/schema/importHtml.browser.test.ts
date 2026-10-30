import { describe, expect, it } from 'vitest'

import {
  type EmbedProvider,
  type JSONContent,
  htmlToEditorValue
} from './index'

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks && { marks })
})
const paragraph = (...content: JSONContent[]): JSONContent =>
  content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' }
const hardBreak = { type: 'hardBreak' }
const bold = [{ type: 'bold' }]

function blocks(html: string, preset: 'basic' | 'rich' = 'rich') {
  return htmlToEditorValue(html, preset).value.doc.content
}

describe('htmlToEditorValue', () => {
  it('returns a current value in the preset', () => {
    const { value, dropped } = htmlToEditorValue('<p>Doors 7pm</p>', 'basic')

    expect(value).toEqual({
      version: 1,
      preset: 'basic',
      doc: { type: 'doc', content: [paragraph(text('Doors 7pm'))] }
    })
    expect(dropped).toEqual([])
  })

  it.each([
    ['empty html', ''],
    ['only whitespace', '  \n '],
    ['only breaks', '<br><br>']
  ])('gives %s one empty paragraph', (_, html) => {
    expect(blocks(html)).toEqual([paragraph()])
  })

  // CKEditor's ENTER_BR mode writes text with no <p>, a <br> per Enter.
  it.each([
    [
      'one break as a hard break',
      'Doors 7pm<br>All ages',
      [paragraph(text('Doors 7pm'), hardBreak, text('All ages'))]
    ],
    [
      'two breaks as a new paragraph',
      'Doors 7pm<br><br>All ages',
      [paragraph(text('Doors 7pm')), paragraph(text('All ages'))]
    ],
    [
      'three or more breaks as one new paragraph',
      'Doors 7pm<br><br><br><br>All ages',
      [paragraph(text('Doors 7pm')), paragraph(text('All ages'))]
    ],
    [
      'breaks around whitespace as a new paragraph',
      'Doors 7pm<br>\n&nbsp;<br>\nAll ages',
      [paragraph(text('Doors 7pm')), paragraph(text('All ages'))]
    ],
    [
      'leading and trailing breaks as nothing',
      '<br>Doors 7pm<br>',
      [paragraph(text('Doors 7pm'))]
    ],
    [
      'breaks inside a paragraph',
      '<p>Doors 7pm<br><br><strong>All ages</strong></p>',
      [paragraph(text('Doors 7pm')), paragraph(text('All ages', bold))]
    ]
  ])('reads %s', (_, html, expected) => {
    expect(blocks(html)).toEqual(expected)
  })

  it('splits paragraphs inside a list item', () => {
    expect(blocks('<ul><li>Doors<br><br>7pm</li></ul>')).toEqual([
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [paragraph(text('Doors')), paragraph(text('7pm'))]
          }
        ]
      }
    ])
  })

  it.each([
    ['h1 as h2', '<h1>Lineup</h1>', 2],
    ['h5 as h4', '<h5>Lineup</h5>', 4]
  ])('reads %s', (_, html, level) => {
    expect(blocks(html)).toEqual([
      { type: 'heading', attrs: { level }, content: [text('Lineup')] }
    ])
  })

  it('keeps a heading’s text as a paragraph in basic', () => {
    expect(blocks('<h1>Lineup</h1><p>Doors 7pm</p>', 'basic')).toEqual([
      paragraph(text('Lineup')),
      paragraph(text('Doors 7pm'))
    ])
  })

  it.each([
    [
      'a styled span',
      '<p><span style="color:#e00;font-size:22px;font-family:Comic Sans MS">Sold out</span></p>'
    ],
    [
      'a font tag',
      '<p><font color="red" size="5" face="Arial">Sold out</font></p>'
    ],
    [
      'Word paste',
      '<p class="MsoNormal" style="margin:0cm"><span lang="EN-AU" style="mso-bidi-font-family:Calibri">Sold out<o:p></o:p></span></p>'
    ],
    [
      'a styled paragraph',
      '<p style="text-align:center;color:red">Sold out</p>'
    ],
    ['a div', '<div style="background:yellow">Sold out</div>']
  ])('drops the styling of %s, keeping its text', (_, html) => {
    const { value, dropped } = htmlToEditorValue(html, 'rich')

    expect(value.doc.content).toEqual([paragraph(text('Sold out'))])
    expect(dropped).toEqual([])
  })

  it('keeps bold, italic, underline and safe links', () => {
    expect(
      blocks(
        '<p><strong>Doors</strong> <em>7pm</em> <u>sharp</u> <a href="https://oztix.com.au" style="color:blue">Tickets</a></p>'
      )
    ).toEqual([
      paragraph(
        text('Doors', bold),
        text(' '),
        text('7pm', [{ type: 'italic' }]),
        text(' '),
        text('sharp', [{ type: 'underline' }]),
        text(' '),
        text('Tickets', [
          { type: 'link', attrs: { href: 'https://oztix.com.au' } }
        ])
      )
    ])
  })

  it('drops a link that could run script, keeping its text', () => {
    expect(blocks('<p><a href="javascript:alert(1)">Tickets</a></p>')).toEqual([
      paragraph(text('Tickets'))
    ])
  })

  it('never keeps script or style content', () => {
    expect(
      blocks(
        '<p>Doors</p><script>alert(1)</script><style>p{color:red}</style><p>7pm</p>'
      )
    ).toEqual([paragraph(text('Doors')), paragraph(text('7pm'))])
  })

  it('keeps a table in rich', () => {
    expect(
      blocks(
        '<table border="1" style="width:500px"><tbody><tr><td><strong>Doors</strong></td><td>7pm</td></tr></tbody></table>'
      )
    ).toEqual([
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [paragraph(text('Doors', bold))]
              },
              {
                type: 'tableCell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [paragraph(text('7pm'))]
              }
            ]
          }
        ]
      }
    ])
  })

  it.each([
    [
      'an image',
      '<img src="https://cdn.oztix.com.au/poster.jpg">',
      { kind: 'image', src: 'https://cdn.oztix.com.au/poster.jpg' }
    ],
    [
      'a player',
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
      { kind: 'embed', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  ])(
    'reports %s in a table cell, which holds only text',
    (_, media, report) => {
      const { value, dropped } = htmlToEditorValue(
        `<table><tbody><tr><td>Poster${media}</td></tr></tbody></table>`,
        'rich'
      )

      expect(value.doc.content?.[0]?.content?.[0]?.content?.[0]).toEqual({
        type: 'tableCell',
        attrs: { colspan: 1, rowspan: 1 },
        content: [paragraph(text('Poster'))]
      })
      expect(dropped).toEqual([report])
    }
  )

  it('keeps the text of other blocks in a table cell, in its cell', () => {
    const cell = (...content: JSONContent[]) => ({
      type: 'tableCell',
      attrs: { colspan: 1, rowspan: 1 },
      content
    })

    expect(
      blocks(
        '<table><tbody><tr><td><h1>Doors</h1><ul><li>7pm</li><li>9pm</li></ul></td><td><blockquote>All ages</blockquote><table><tbody><tr><td>Bar</td></tr></tbody></table></td></tr></tbody></table><p>Tickets</p>'
      )
    ).toEqual([
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              cell(
                paragraph(text('Doors')),
                paragraph(text('7pm')),
                paragraph(text('9pm'))
              ),
              cell(paragraph(text('All ages')), paragraph(text('Bar')))
            ]
          }
        ]
      },
      paragraph(text('Tickets'))
    ])
  })

  it('keeps a table’s text in basic', () => {
    expect(
      blocks(
        '<table><tbody><tr><td>Doors</td><td>7pm</td></tr></tbody></table>',
        'basic'
      )
    ).toEqual([paragraph(text('Doors')), paragraph(text('7pm'))])
  })

  describe('images', () => {
    it('keeps an https image', () => {
      const { value, dropped } = htmlToEditorValue(
        '<p><img src="https://cdn.oztix.com.au/poster.jpg" alt="Poster" style="width:300px"></p>',
        'rich'
      )

      expect(value.doc.content).toContainEqual({
        type: 'image',
        attrs: { src: 'https://cdn.oztix.com.au/poster.jpg', alt: 'Poster' }
      })
      expect(dropped).toEqual([])
    })

    it.each([
      [
        'a base64 image',
        '<p>Poster<img src="data:image/png;base64,iVBORw0KGgo="></p>',
        'rich',
        { kind: 'image' }
      ],
      [
        'an http image',
        '<p>Poster<img src="http://cdn.oztix.com.au/poster.jpg"></p>',
        'rich',
        { kind: 'image', src: 'http://cdn.oztix.com.au/poster.jpg' }
      ],
      [
        'any image in basic',
        '<p>Poster<img src="https://cdn.oztix.com.au/poster.jpg"></p>',
        'basic',
        { kind: 'image', src: 'https://cdn.oztix.com.au/poster.jpg' }
      ]
    ] as const)('drops and reports %s', (_, html, preset, report) => {
      const { value, dropped } = htmlToEditorValue(html, preset)

      expect(value.doc.content).toEqual([paragraph(text('Poster'))])
      expect(dropped).toEqual([report])
    })
  })

  describe('iframes', () => {
    it.each([
      [
        'YouTube',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        { provider: 'youtube', id: 'dQw4w9WgXcQ', params: null }
      ],
      [
        'Vimeo',
        'https://player.vimeo.com/video/76979871',
        { provider: 'vimeo', id: '76979871', params: null }
      ],
      [
        'protocol-relative YouTube',
        '//www.youtube.com/embed/dQw4w9WgXcQ',
        { provider: 'youtube', id: 'dQw4w9WgXcQ', params: null }
      ],
      [
        'Spotify',
        'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
        {
          provider: 'spotify',
          id: '4uLU6hMCjMI75M1A2tKUQC',
          params: { type: 'track' }
        }
      ]
    ])('reads a %s player as an embed', (_, src, attrs) => {
      const { value, dropped } = htmlToEditorValue(
        `<p>Watch</p><iframe src="${src}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`,
        'rich'
      )

      expect(value.doc.content).toEqual([
        paragraph(text('Watch')),
        { type: 'embed', attrs }
      ])
      expect(dropped).toEqual([])
    })

    it.each([
      [
        'an unknown player',
        'rich',
        'https://evil.example/embed/x',
        { kind: 'embed', src: 'https://evil.example/embed/x' }
      ],
      [
        'a look-alike host',
        'rich',
        'https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ',
        {
          kind: 'embed',
          src: 'https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ'
        }
      ],
      ['an iframe with no src', 'rich', undefined, { kind: 'embed' }],
      [
        'any player in basic',
        'basic',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        { kind: 'embed', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    ] as const)('drops and reports %s', (_, preset, src, report) => {
      const iframe = src
        ? `<iframe src="${src}"></iframe>`
        : '<iframe></iframe>'
      const { value, dropped } = htmlToEditorValue(
        `<p>Watch</p>${iframe}`,
        preset
      )

      expect(value.doc.content).toEqual([paragraph(text('Watch'))])
      expect(dropped).toEqual([report])
    })
  })

  describe('embedProviders', () => {
    const venueTv: EmbedProvider = {
      name: 'venuetv',
      id: /^\d+$/,
      aspect: '16:9',
      match: (url) =>
        url.hostname === 'tv.oztix.com.au'
          ? { id: url.pathname.slice(1) }
          : null,
      src: ({ id }) => `https://tv.oztix.com.au/${id}`
    }

    it('reads an app provider’s player as an embed', () => {
      const { value, dropped } = htmlToEditorValue(
        '<iframe src="https://tv.oztix.com.au/42"></iframe>',
        'rich',
        { embedProviders: [venueTv] }
      )

      expect(value.doc.content).toEqual([
        {
          type: 'embed',
          attrs: { provider: 'venuetv', id: '42', params: null }
        }
      ])
      expect(dropped).toEqual([])
    })

    it('replaces the default providers', () => {
      const { dropped } = htmlToEditorValue(
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        'rich',
        { embedProviders: [venueTv] }
      )

      expect(dropped).toEqual([
        { kind: 'embed', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ])
    })
  })

  it.each([
    [
      'a video',
      '<video src="https://cdn.oztix.com.au/a.mp4"></video>',
      'https://cdn.oztix.com.au/a.mp4'
    ],
    [
      'an audio player',
      '<audio src="https://cdn.oztix.com.au/a.mp3"></audio>',
      'https://cdn.oztix.com.au/a.mp3'
    ],
    [
      'an object',
      '<object data="https://cdn.oztix.com.au/a.swf"></object>',
      'https://cdn.oztix.com.au/a.swf'
    ],
    [
      'an embed element',
      '<embed src="https://cdn.oztix.com.au/a.swf">',
      'https://cdn.oztix.com.au/a.swf'
    ],
    [
      'a video with only sources',
      '<video><source src="https://cdn.oztix.com.au/a.mp4"></video>',
      undefined
    ]
  ])('drops and reports %s', (_, media, src) => {
    const { value, dropped } = htmlToEditorValue(`<p>Watch</p>${media}`, 'rich')

    expect(value.doc.content).toEqual([paragraph(text('Watch'))])
    expect(dropped).toEqual([src ? { kind: 'media', src } : { kind: 'media' }])
  })

  it('reports media inside media once', () => {
    const { dropped } = htmlToEditorValue(
      '<object data="https://cdn.oztix.com.au/a.swf"><embed src="https://cdn.oztix.com.au/a.swf"></object><video><img src="data:image/gif;base64,R0lGOD"></video>',
      'rich'
    )

    expect(dropped).toEqual([
      { kind: 'media', src: 'https://cdn.oztix.com.au/a.swf' },
      { kind: 'media' }
    ])
  })

  it('reports each dropped item in document order', () => {
    const { dropped } = htmlToEditorValue(
      '<img src="data:image/gif;base64,R0lGOD"><iframe src="https://evil.example/x"></iframe><video></video>',
      'rich'
    )

    expect(dropped.map(({ kind }) => kind)).toEqual(['image', 'embed', 'media'])
  })

  it('throws a RangeError on an unknown preset', () => {
    // @ts-expect-error: checks the runtime guard
    expect(() => htmlToEditorValue('<p>Doors</p>', 'fancy')).toThrow(RangeError)
  })
})
