import { describe, expect, it } from 'vitest'

import type { JSONContent, StoredEditorValue } from '../schema'
import { defaultEmailTheme, renderEmail } from './index'

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks && { marks })
})
const p = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  content
})
const heading = (level: number, value: string): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [text(value)]
})
const button = (href: string, label = 'Get tickets'): JSONContent => ({
  type: 'button',
  attrs: { href },
  content: [text(label)]
})
const image = (src: string, width: number | null = null): JSONContent => ({
  type: 'image',
  attrs: { src, alt: 'The crowd at sunset', width }
})
const column = (...content: JSONContent[]) => ({ type: 'column', content })
const columns = (...content: JSONContent[]) => ({ type: 'columns', content })
const section = (...content: JSONContent[]) => ({ type: 'section', content })
const link = (href: string) => [{ type: 'link', attrs: { href } }]

const email = (...content: JSONContent[]): StoredEditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const body = (html: string) => html.slice(html.indexOf('<body'))

const poster = 'https://assets.oztix.com.au/ochre-kite-weekender.webp'
const tickets = 'https://www.oztix.com.au/ochre-kite-weekender'

describe('renderEmail', () => {
  describe('each node', () => {
    it('renders text with its marks, escaped', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          p(
            text('Doors open '),
            text('7pm', [{ type: 'bold' }]),
            text(', '),
            text('all ages', [{ type: 'italic' }, { type: 'underline' }]),
            text(' <script>&</script> '),
            text('see the map', link('https://www.oztix.com.au/map'))
          )
        )
      )
      expect(html).toContain('<strong>7pm</strong>')
      expect(html).toContain('<u><em>all ages</em></u>')
      expect(html).toContain('&lt;script&gt;&amp;&lt;/script&gt;')
      expect(html).toContain(
        `<a href="https://www.oztix.com.au/map" style="color:${defaultEmailTheme.link};text-decoration:underline">see the map</a>`
      )
      expect(plain).toBe(
        'Doors open 7pm, all ages <script>&</script> see the map\n[https://www.oztix.com.au/map]'
      )
      expect(body(html)).toMatchSnapshot()
    })

    it('renders headings two to four at their sizes', async () => {
      const { html } = await renderEmail(
        email(heading(2, 'Lineup'), heading(3, 'Friday'), heading(4, 'Stage 2'))
      )
      expect(html).toContain(
        '<h2 style="margin:0;font-weight:700;font-size:24px'
      )
      expect(html).toContain(
        '<h3 style="margin:0;font-weight:700;font-size:20px'
      )
      expect(html).toContain(
        '<h4 style="margin:0;font-weight:700;font-size:16px'
      )
      expect(body(html)).toMatchSnapshot()
    })

    it('renders lists, with an ordered list’s start', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [p(text('Bar'))] }]
          },
          {
            type: 'orderedList',
            attrs: { start: 3 },
            content: [{ type: 'listItem', content: [p(text('Food trucks'))] }]
          }
        )
      )
      expect(html).toContain(
        '<ul style="margin:0;padding:0 0 0 24px"><li><p style="margin:0">Bar</p></li></ul>'
      )
      expect(html).toContain('<ol start="3"')
      expect(plain).toBe(' * Bar\n\n 3. Food trucks')
      expect(body(html)).toMatchSnapshot()
    })

    it('renders a button as a link in the theme’s colours, its label as text', async () => {
      const { html, text: plain } = await renderEmail(email(button(tickets)), {
        theme: { button: '#5f270f', buttonText: '#ffc3a8' }
      })
      expect(html).toContain(`href="${tickets}"`)
      expect(html).toContain('background:#5f270f')
      expect(html).toContain('color:#ffc3a8')
      expect(plain).toBe(`Get tickets [${tickets}]`)
      expect(body(html)).toMatchSnapshot()
    })

    it('renders an image at its width, or filling its column', async () => {
      const { html, text: plain } = await renderEmail(
        email(image(poster, 280), image(`${poster}?full`))
      )
      expect(html).toMatch(
        /<img[^>]*alt="The crowd at sunset"[^>]*src="https:\/\/assets\.oztix\.com\.au\/ochre-kite-weekender\.webp"[^>]*width="280"/
      )
      expect(html).toMatch(/<img[^>]*src="[^"]+\?full"[^>]*width="552"/)
      expect(plain).toBe('')
      expect(body(html)).toMatchSnapshot()
    })

    it('renders a spacer at its height and a divider in the theme’s colour', async () => {
      const { html } = await renderEmail(
        email(
          { type: 'spacer', attrs: { height: 48 } },
          { type: 'horizontalRule' }
        )
      )
      expect(html).toContain('height:48px')
      expect(html).toContain(
        `border-top:solid 1px ${defaultEmailTheme.divider}`
      )
      expect(body(html)).toMatchSnapshot()
    })

    it('renders columns that stack on phones and hold in Outlook', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          columns(
            column(p(text('Friday'))),
            column(p(text('Saturday'))),
            column(p(text('Sunday')))
          )
        )
      )
      expect(
        html.match(/class="mj-column-per-33-333333333333336 /g)
      ).toHaveLength(3)
      expect(html).toContain('@media only screen and (min-width:480px)')
      expect(html).toContain('<!--[if mso | IE]>')
      expect(plain).toBe('Friday\n\nSaturday\n\nSunday')
      expect(body(html)).toMatchSnapshot()
    })

    it('renders a section around its blocks and columns', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          p(text('Before')),
          section(
            p(text('Ochre Kite Weekender')),
            columns(column(p(text('Friday'))), column(p(text('Saturday'))))
          ),
          p(text('After'))
        )
      )
      expect(plain).toBe(
        'Before\n\nOchre Kite Weekender\n\nFriday\n\nSaturday\n\nAfter'
      )
      expect(html.match(/class="mj-column-per-100 /g)).toHaveLength(3)
      expect(html.match(/padding:16px 0;/g)).toHaveLength(1)
      expect(body(html)).toMatchSnapshot()
    })
  })

  it('renders a whole template as an HTML page and its plain text', async () => {
    const { html, text: plain } = await renderEmail(
      email(
        heading(2, 'Ochre Kite Weekender'),
        p(
          text('Doors open 7pm at '),
          text('Jumbuck Orchard Park', link(tickets)),
          text('.')
        ),
        section(
          columns(
            column(image(poster, 280)),
            column(p(text('Two stages, one weekend.')), button(tickets))
          ),
          p(text('All ages.'))
        ),
        { type: 'spacer', attrs: { height: 32 } },
        { type: 'horizontalRule' },
        p(text('See you there.'))
      )
    )
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).not.toContain('var(--')
    expect(html).toContain(`background-color:${defaultEmailTheme.background}`)
    expect(plain).toBe(
      [
        'OCHRE KITE WEEKENDER',
        '',
        'Doors open 7pm at Jumbuck Orchard Park',
        `[${tickets}].`,
        '',
        'Two stages, one weekend.',
        '',
        `Get tickets [${tickets}]`,
        '',
        'All ages.',
        '',
        'See you there.'
      ].join('\n')
    )
    expect(body(html)).toMatchSnapshot()
  })

  describe('safety', () => {
    it('keeps the text of links and buttons a mail client can’t open', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          p(text('Run me', link('javascript:alert(1)'))),
          p(text('On the site', link('/tickets'))),
          button('javascript:alert(1)', 'Click')
        )
      )
      expect(html).not.toContain('javascript:')
      expect(html).not.toContain('href="/tickets"')
      expect(plain).toBe('Run me\n\nOn the site\n\nClick')
    })

    it('escapes attributes MJML writes as given', async () => {
      const { html } = await renderEmail(
        email({
          type: 'image',
          attrs: { src: `${poster}?a=1&b="2"`, alt: '"><script>x</script>' }
        })
      )
      expect(html).not.toContain('<script>')
      expect(html).toContain('alt="&quot;&gt;&lt;script&gt;x&lt;/script&gt;"')
      expect(html).toContain(
        'src="https://assets.oztix.com.au/ochre-kite-weekender.webp?a=1&amp;b=&quot;2&quot;"'
      )
    })

    it('escapes a link’s and a button’s href, and a button’s label', async () => {
      const { html } = await renderEmail(
        email(
          p(text('Map', link('https://www.oztix.com.au/"><script>x</script>'))),
          button('https://www.oztix.com.au/?a=1&b="><img>', 'Go <b>')
        )
      )
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('<img>')
      expect(html).not.toContain('<b>')
      expect(html).toContain(
        'href="https://www.oztix.com.au/&quot;&gt;&lt;script&gt;x&lt;/script&gt;"'
      )
      expect(html).toContain(
        'href="https://www.oztix.com.au/?a=1&amp;b=&quot;&gt;&lt;img&gt;"'
      )
      expect(html).toContain('Go &lt;b&gt;')
    })

    it('drops a node the email preset doesn’t hold, keeping its text', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          { type: 'marquee', content: [p(text('Still here'))] },
          { type: 'embed', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } }
        )
      )
      expect(plain).toBe('Still here')
      expect(html).not.toContain('marquee')
      expect(html).not.toContain('youtube')
    })

    it('refuses a theme colour that isn’t hex', async () => {
      await expect(
        renderEmail(email(p(text('Hi'))), {
          theme: { button: 'red;"><script>' }
        })
      ).rejects.toThrow(TypeError)
    })

    it('refuses a font stack that could leave its style', async () => {
      await expect(
        renderEmail(email(p(text('Hi'))), {
          theme: { fontFamily: 'Arial;"><script>' }
        })
      ).rejects.toThrow(TypeError)
    })
  })

  it('starts and ends the plain text at its words', async () => {
    const { text: plain } = await renderEmail(
      email(
        { type: 'spacer', attrs: { height: 48 } },
        p(text('Doors open 7pm.')),
        { type: 'spacer', attrs: { height: 48 } }
      )
    )
    expect(plain).toBe('Doors open 7pm.')
  })

  it('reads a value from another preset into the email preset first', async () => {
    const rich: StoredEditorValue = {
      version: 1,
      preset: 'rich',
      doc: {
        type: 'doc',
        content: [
          heading(1, 'Lineup'),
          {
            type: 'blockquote',
            content: [p(text('Best weekend of the year.'))]
          },
          image('http://assets.oztix.com.au/poster.webp')
        ]
      }
    }
    const { html, text: plain } = await renderEmail(rich)
    expect(html).toContain('<h2 ')
    expect(html).not.toContain('<blockquote')
    expect(html).not.toContain('<img')
    expect(plain).toBe('LINEUP\n\nBest weekend of the year.')
  })
})
