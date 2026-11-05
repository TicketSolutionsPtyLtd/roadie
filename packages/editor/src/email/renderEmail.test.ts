import { describe, expect, it } from 'vitest'

import type {
  EditorVariable,
  JSONContent,
  StoredEditorValue,
  StoredEmailContent
} from '../schema'
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

const email = (...content: JSONContent[]): StoredEmailContent => ({
  kind: 'design',
  value: { version: 1, preset: 'email', doc: { type: 'doc', content } }
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

    it('renders a button centred or at its end, or across its column', async () => {
      const { html } = await renderEmail(
        email(
          {
            ...button(tickets, 'Centred'),
            attrs: { href: tickets, align: 'center' }
          },
          {
            ...button(tickets, 'Right'),
            attrs: { href: tickets, align: 'right' }
          },
          {
            ...button(tickets, 'Full'),
            attrs: { href: tickets, fullWidth: true }
          }
        )
      )
      // Each block's cell opens with its alignment, then its padding.
      const cellOf = (label: string) =>
        html.slice(0, html.indexOf(label)).split('style="font-size:0px;').at(-2)
      expect(cellOf('Centred')).toMatch(/align="center" $/)
      expect(cellOf('Right')).toMatch(/align="right" $/)
      expect(cellOf('Full')).toMatch(/align="left" $/)
      expect(
        html.slice(html.lastIndexOf('<table', html.indexOf('Full')))
      ).toMatch(/^<table[^>]*width:100%/)
    })

    it('renders a strong button in the accent, and normal and subtle ones in neutrals', async () => {
      const look = (emphasis: string | undefined, label: string) => ({
        ...button(tickets, label),
        attrs: { href: tickets, ...(emphasis && { emphasis }) }
      })
      const { html } = await renderEmail(
        email(
          look(undefined, 'Strong'),
          look('normal', 'Normal'),
          look('subtle', 'Subtle')
        ),
        {
          theme: {
            accent: '#5f270f',
            background: '#fffaf5',
            text: '#222222',
            border: '#cccccc',
            tint: '#eeeeee'
          }
        }
      )
      // Each button's HTML runs from the label before it to its own.
      const strong = html.slice(0, html.indexOf('Strong'))
      expect(strong.slice(strong.lastIndexOf('bgcolor'))).toContain(
        'background:#5f270f'
      )
      const normal = html.slice(html.indexOf('Strong'), html.indexOf('Normal'))
      expect(normal).toContain('border:1px solid #cccccc')
      expect(normal).toContain('background:#fffaf5')
      expect(normal).toContain('color:#222222')
      // A strong button's 12px 24px, less the border, so they're one size.
      expect(normal).toContain('padding:11px 23px')
      const subtle = html.slice(html.indexOf('Normal'), html.indexOf('Subtle'))
      expect(subtle).toContain('background:#eeeeee')
      expect(subtle).toContain('color:#222222')
      expect(subtle).not.toContain('border:1px')
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
        'Ochre Kite Weekender',
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

    it('writes an ordered list’s start and type only when valid', async () => {
      const { html } = await renderEmail(
        email({
          type: 'orderedList',
          attrs: { start: '2"><script>x</script>', type: '"><script>x' },
          content: [{ type: 'listItem', content: [p(text('Food trucks'))] }]
        })
      )
      expect(html).not.toContain('<script>')
      expect(html).toContain('<ol style=')
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

  describe('a preheader', () => {
    const withPreheader = (preheader: string): StoredEmailContent => ({
      kind: 'design',
      value: {
        version: 1,
        preset: 'email',
        doc: {
          type: 'doc',
          attrs: { preheader },
          content: [p(text('Doors 7pm'))]
        }
      }
    })

    it('writes it as the hidden line inboxes show, escaped', async () => {
      const { html } = await renderEmail(withPreheader('Two weeks <to> go'))
      const start = body(html)
      expect(start).toMatch(/display:none[^>]*>Two weeks &lt;to&gt; go/)
      expect(start.indexOf('Two weeks')).toBeLessThan(
        start.indexOf('Doors 7pm')
      )
    })

    it('leaves it out of the plain text', async () => {
      const { text: plain } = await renderEmail(
        withPreheader('Two weeks to go')
      )
      expect(plain).toBe('Doors 7pm')
    })

    it('never sends one as a token', async () => {
      const { html } = await renderEmail(withPreheader('Hi {{ name }}'), {
        syntax: 'liquid'
      })
      expect(html).not.toContain('{{ name }}')
    })

    it('writes none without one', async () => {
      const { html } = await renderEmail(email(p(text('Doors 7pm'))))
      expect(body(html)).not.toMatch(/display:none/)
    })
  })

  describe('empty lines', () => {
    const blank: JSONContent[] = [
      { type: 'paragraph' },
      p(text('   ')),
      { type: 'paragraph', content: [{ type: 'hardBreak' }] }
    ]

    it('sends none of them as blank space', async () => {
      const { html, text: plain } = await renderEmail(
        email(...blank, p(text('Doors 7pm')), ...blank)
      )
      const { html: alone } = await renderEmail(email(p(text('Doors 7pm'))))
      expect(html).toBe(alone)
      expect(plain).toBe('Doors 7pm')
    })

    it('sends a section holding only empty lines as nothing', async () => {
      const { html } = await renderEmail(
        email(section(...blank), p(text('Doors 7pm')))
      )
      const { html: alone } = await renderEmail(email(p(text('Doors 7pm'))))
      expect(html).toBe(alone)
    })

    const item = (...content: JSONContent[]) => ({
      type: 'listItem',
      content
    })
    const list = (...content: JSONContent[]) => ({
      type: 'bulletList',
      content
    })

    it('sends no empty list item, as no blank bullet', async () => {
      const { html } = await renderEmail(
        email(list(item(p(text('Marri Lane'))), item({ type: 'paragraph' })))
      )
      const { html: alone } = await renderEmail(
        email(list(item(p(text('Marri Lane')))))
      )
      expect(html).toBe(alone)
    })

    it('sends no list left with no items', async () => {
      const { html } = await renderEmail(
        email(
          list(item({ type: 'paragraph' }), item(p(text(' ')))),
          p(text('Doors 7pm'))
        )
      )
      const { html: alone } = await renderEmail(email(p(text('Doors 7pm'))))
      expect(html).toBe(alone)
    })

    it('keeps an item with a nested list that has words', async () => {
      const { html } = await renderEmail(
        email(
          list(
            item({ type: 'paragraph' }, list(item(p(text('Dusty Banksia')))))
          )
        )
      )
      expect(body(html)).toContain('Dusty Banksia')
    })
  })

  it('links no web font, even for a font MJML knows', async () => {
    const { html } = await renderEmail(email(p(text('Hi'))), {
      theme: { fontFamily: 'Roboto, Arial, sans-serif' }
    })
    expect(html).toContain('font-family:Roboto, Arial, sans-serif')
    expect(html).not.toContain('fonts.googleapis.com')
  })

  it('keeps a heading’s case in the plain text, around a merge tag', async () => {
    const { text: plain } = await renderEmail(
      email({
        type: 'heading',
        attrs: { level: 2 },
        content: [
          text('See you soon, '),
          { type: 'variable', attrs: { key: 'first_name' } }
        ]
      }),
      {
        variables: [{ key: 'first_name', label: 'First name', tokens: {} }],
        values: { first_name: 'Ash' }
      }
    )
    expect(plain).toBe('See you soon, Ash')
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
    const { html, text: plain } = await renderEmail({
      kind: 'design',
      value: rich
    })
    expect(html).toContain('<h2 ')
    expect(html).not.toContain('<blockquote')
    expect(html).not.toContain('<img')
    expect(plain).toBe('Lineup\n\nBest weekend of the year.')
  })

  describe('merge tags', () => {
    const variables: EditorVariable[] = [
      {
        key: 'first_name',
        label: 'First name',
        tokens: { ae: '#FirstName#', liquid: '{{ customer.first_name }}' }
      },
      {
        key: 'event_date',
        label: 'Event date',
        tokens: { liquid: '{{ event.date | date: "%-d %B" }}' }
      },
      {
        key: 'unsubscribe_url',
        label: 'Unsubscribe page',
        kind: 'url',
        tokens: { ae: '#OptOut#', liquid: '{{ unsubscribe_url }}' }
      }
    ]
    const tag = (key: string, fallback?: string): JSONContent => ({
      type: 'variable',
      attrs: { key, ...(fallback !== undefined && { fallback }) }
    })
    const greeting = (fallback?: string) =>
      email(p(text('Hi '), tag('first_name', fallback), text('!')))

    it('writes each variable as its AE token, in the HTML and the plain text', async () => {
      const { html, text: plain } = await renderEmail(greeting(), {
        syntax: 'ae',
        variables
      })
      expect(html).toContain('<p style="margin:0">Hi #FirstName#!</p>')
      expect(plain).toBe('Hi #FirstName#!')
    })

    it('writes each variable as its Liquid token, filters and all, unescaped', async () => {
      const { html, text: plain } = await renderEmail(
        email(p(text('Doors open '), tag('event_date'))),
        { syntax: 'liquid', variables }
      )
      expect(html).toContain('Doors open {{ event.date | date: "%-d %B" }}</p>')
      expect(plain).toBe('Doors open {{ event.date | date: "%-d %B" }}')
    })

    it('gives a Liquid token the fallback as its default, escaped for the HTML', async () => {
      const { html, text: plain } = await renderEmail(
        greeting('<b>"Mate"</b>'),
        { syntax: 'liquid', variables }
      )
      expect(html).toContain(
        'Hi {{ customer.first_name | default: "&lt;b&gt;&quot;Mate&quot;&lt;/b&gt;" }}!'
      )
      expect(plain).toBe(
        `Hi {{ customer.first_name | default: '<b>"Mate"</b>' }}!`
      )
    })

    it('writes an AE token alone, which has no default', async () => {
      const { text: plain } = await renderEmail(greeting('there'), {
        syntax: 'ae',
        variables
      })
      expect(plain).toBe('Hi #FirstName#!')
    })

    it('writes a variable in a button’s label', async () => {
      const { html } = await renderEmail(
        email({
          type: 'button',
          attrs: { href: tickets },
          content: [text('Tickets for '), tag('first_name')]
        }),
        { syntax: 'ae', variables }
      )
      expect(html).toMatch(/>\s*Tickets for #FirstName#\s*</)
    })

    it('writes a link variable’s token as a link’s href', async () => {
      const unsubscribe = email(
        p(
          text('Unsubscribe', [
            { type: 'link', attrs: { variable: 'unsubscribe_url' } }
          ])
        )
      )
      const ae = await renderEmail(unsubscribe, { syntax: 'ae', variables })
      expect(ae.html).toMatch(/<a href="#OptOut#"[^>]*>Unsubscribe<\/a>/)
      expect(ae.text).toBe('Unsubscribe [#OptOut#]')

      const liquid = await renderEmail(unsubscribe, {
        syntax: 'liquid',
        variables
      })
      expect(liquid.html).toContain('<a href="{{ unsubscribe_url }}"')
    })

    it('writes a link variable’s token as a button’s href', async () => {
      const { html } = await renderEmail(
        email({
          type: 'button',
          attrs: { variable: 'unsubscribe_url' },
          content: [text('Unsubscribe')]
        }),
        { syntax: 'ae', variables }
      )
      expect(html).toMatch(/<a[^>]* href="#OptOut#"[^>]*>\s*Unsubscribe\s*</)
    })

    it('links to a link variable’s value for a preview', async () => {
      const { html } = await renderEmail(
        email(
          p(
            text('Unsubscribe', [
              { type: 'link', attrs: { variable: 'unsubscribe_url' } }
            ])
          )
        ),
        {
          variables,
          values: {
            unsubscribe_url: 'https://www.oztix.com.au/unsubscribe?a=1&b=2'
          }
        }
      )
      expect(html).toContain(
        'href="https://www.oztix.com.au/unsubscribe?a=1&amp;b=2"'
      )
    })

    it('writes a link variable’s value as a preview’s plain-text href', async () => {
      const { text: plain } = await renderEmail(
        email(
          p(
            text('Unsubscribe', [
              { type: 'link', attrs: { variable: 'unsubscribe_url' } }
            ])
          )
        ),
        {
          variables,
          values: { unsubscribe_url: 'https://www.oztix.com.au/unsubscribe' }
        }
      )
      expect(plain).toBe('Unsubscribe [https://www.oztix.com.au/unsubscribe]')
    })

    it('refuses a link to a variable the app doesn’t list', async () => {
      await expect(
        renderEmail(
          email(
            p(
              text('Unsubscribe', [
                { type: 'link', attrs: { variable: 'opt_out_url' } }
              ])
            )
          ),
          { syntax: 'ae', variables }
        )
      ).rejects.toThrow('"opt_out_url"')
    })

    it('leaves a link to a variable that isn’t a link variable unlinked', async () => {
      const { html } = await renderEmail(
        email(
          p(text('Hi', [{ type: 'link', attrs: { variable: 'first_name' } }]))
        ),
        { syntax: 'ae', variables }
      )
      expect(html).not.toContain('<a ')
      expect(html).not.toContain('#FirstName#')
    })

    it.each([
      ['no value', {}],
      [
        'a value no mail client can open',
        { unsubscribe_url: 'javascript:alert(1)' }
      ]
    ])(
      'leaves a link variable unlinked in a preview with %s',
      async (_, values) => {
        const { html } = await renderEmail(
          email(
            p(
              text('Unsubscribe', [
                { type: 'link', attrs: { variable: 'unsubscribe_url' } }
              ])
            )
          ),
          { variables, values }
        )
        expect(html).not.toContain('<a ')
        expect(html).toContain('Unsubscribe')
      }
    )

    it('fills each variable with its value for a preview, escaped for the HTML', async () => {
      const { html, text: plain } = await renderEmail(greeting('there'), {
        variables,
        values: { first_name: '<Ashley & co>' }
      })
      expect(html).toContain('Hi &lt;Ashley &amp; co&gt;!')
      expect(plain).toBe('Hi <Ashley & co>!')
    })

    it('fills a value that reads as a token so no sender fills it', async () => {
      const { html, text: plain } = await renderEmail(greeting(), {
        variables,
        values: { first_name: '{{ secret }} #Code#' }
      })
      expect(html).toContain(
        'Hi &#123;&#123; secret &#125;&#125; &#35;Code&#35;!'
      )
      expect(plain).not.toContain('{{')
      expect(plain).not.toContain('#Code#')
      expect(plain.replaceAll('​', '')).toBe('Hi {{ secret }} #Code#!')
    })

    it.each([
      ['ae', '#VIP', '#', '#FirstName#', ['#VIP#', '##']],
      ['liquid', '{', '}', '{{ customer.first_name }}', ['{{{', '}}}']]
    ] as const)(
      'keeps typed %s token characters beside a variable from joining its token in the plain text',
      async (syntax, before, after, token, joined) => {
        const { text: plain } = await renderEmail(
          email(p(text(`Hi ${before}`), tag('first_name'), text(after))),
          { syntax, variables }
        )
        expect(plain).toContain(token)
        for (const run of joined) expect(plain).not.toContain(run)
        expect(plain.replaceAll('​', '')).toBe(`Hi ${before}${token}${after}`)
      }
    )

    it.each([
      ['ae', '{', '%', 'Hi {#FirstName#%'],
      ['liquid', '#', '%', 'Hi #{{ customer.first_name }}%']
    ] as const)(
      'leaves characters beside a variable that %s doesn’t read as a token as typed',
      async (syntax, before, after, written) => {
        const { text: plain } = await renderEmail(
          email(p(text(`Hi ${before}`), tag('first_name'), text(after))),
          { syntax, variables }
        )
        expect(plain).toBe(written)
      }
    )

    it('keeps typed token characters beside a preview’s value from making a token of it', async () => {
      const { text: plain } = await renderEmail(
        email(p(text('Hi #'), tag('first_name'), text('#'))),
        { syntax: 'liquid', variables, values: { first_name: 'Code' } }
      )
      expect(plain).not.toContain('#Code#')
      expect(plain.replaceAll('​', '')).toBe('Hi #Code#')
    })

    it('keeps a fallback with quotes and braces inside its Liquid default in the plain text', async () => {
      const { text: plain } = await renderEmail(greeting(`"Mate's" }} {{ x`), {
        syntax: 'liquid',
        variables
      })
      expect(plain).toBe(
        `Hi {{ customer.first_name | default: '"Mate’s" }​} {​{ x' }}!`
      )
    })

    it('gives a Liquid token of more than one output no default', async () => {
      const both = '{{ customer.first_name }} {{ customer.last_name }}'
      const { html, text: plain } = await renderEmail(greeting('there'), {
        syntax: 'liquid',
        variables: [
          { key: 'first_name', label: 'Name', tokens: { liquid: both } }
        ]
      })
      expect(html).toContain(`Hi ${both}!`)
      expect(plain).toBe(`Hi ${both}!`)
    })

    it('keeps a Liquid token’s whitespace control around its default', async () => {
      const { html } = await renderEmail(greeting('there'), {
        syntax: 'liquid',
        variables: [
          {
            key: 'first_name',
            label: 'First name',
            tokens: { liquid: '{{- customer.first_name -}}' }
          }
        ]
      })
      expect(html).toContain(
        'Hi {{- customer.first_name | default: "there" -}}!'
      )
    })

    it('fills a variable keyed like an object’s own property from values alone', async () => {
      const { text: plain } = await renderEmail(
        email(p(text('Hi '), tag('constructor', 'there'))),
        {
          variables: [{ key: 'constructor', label: 'Odd', tokens: {} }],
          values: {}
        }
      )
      expect(plain).toBe('Hi there')
    })

    it.each([
      ['its fallback', 'there', 'Hi there!'],
      ['nothing without a fallback', undefined, 'Hi !']
    ])(
      'fills a variable with no value with %s',
      async (_name, fallback, read) => {
        const { text: plain } = await renderEmail(greeting(fallback), {
          variables,
          values: { first_name: '' }
        })
        expect(plain).toBe(read)
      }
    )

    it('refuses a variable the app doesn’t list', async () => {
      await expect(
        renderEmail(email(p(tag('ticket_type'))), {
          syntax: 'liquid',
          variables,
          values: {}
        })
      ).rejects.toThrow('"ticket_type"')
    })

    it('refuses a variable with no token in the syntax', async () => {
      await expect(
        renderEmail(email(p(tag('event_date'))), { syntax: 'ae', variables })
      ).rejects.toThrow('"event_date" has no ae token')
    })

    it('refuses merge tags with neither a syntax nor values', async () => {
      await expect(renderEmail(greeting(), { variables })).rejects.toThrow(
        TypeError
      )
    })

    it('writes typed text that reads as a token so no sender fills it', async () => {
      const typed =
        'Use {{ code }}, {% if vip %}, #FirstName# or [ViewInBrowserLink], \uE0000\uE001 #1 fan'
      const { html, text: plain } = await renderEmail(
        email(
          p(
            text(typed),
            text(' map', link('https://www.oztix.com.au/?q={{id}}'))
          )
        ),
        { syntax: 'liquid', variables, values: { first_name: 'Ashley' } }
      )
      for (const token of [
        '{{',
        '{%',
        '%}',
        '}}',
        '#FirstName#',
        '[ViewInBrowserLink]',
        'Ashley'
      ]) {
        expect(html).not.toContain(token)
        expect(plain).not.toContain(token)
      }
      expect(html).toContain('Use &#123;&#123; code &#125;&#125;')
      expect(plain.replaceAll('\u200B', '')).toBe(
        'Use {{ code }}, {% if vip %}, #FirstName# or [ViewInBrowserLink], 0 #1 fan map\n[https://www.oztix.com.au/?q={{id}}]'
      )
    })
  })

  describe('conditions', () => {
    const variables: EditorVariable[] = [
      {
        key: 'tickets_left',
        label: 'Tickets left',
        tokens: { liquid: '{{ event.tickets_left }}' }
      },
      {
        key: 'ticket_type',
        label: 'Ticket type',
        tokens: { ae: '#TicketType#', liquid: '{{- ticket.type -}}' }
      },
      {
        key: 'event_date',
        label: 'Event date',
        tokens: { liquid: '{{ event.date | date: "%-d %B" }}' }
      },
      {
        key: 'first_name',
        label: 'First name',
        tokens: { ae: '#FirstName#' }
      }
    ]
    const when = (node: JSONContent, showWhen: unknown): JSONContent => ({
      ...node,
      attrs: { ...node.attrs, showWhen }
    })
    const nearlySoldOut = { key: 'tickets_left', op: 'lessThan', value: 20 }
    const offer = (showWhen: unknown) =>
      email(
        p(text('Before')),
        when(button(tickets, 'Grab the last few'), showWhen),
        p(text('After'))
      )
    const liquid = (value: StoredEmailContent) =>
      renderEmail(value, { syntax: 'liquid', variables })
    // What a Liquid sender does with a condition that doesn't hold.
    const hidden = (html: string) =>
      body(html)
        .replace(/\{%-? if [^%]*%\}[\s\S]*?\{%-? endif %\}/g, '')
        .replace(/<!\[endif\]-->\s*<!--\[if mso \| IE\]>/g, '')
        .replace(/\s+/g, ' ')

    it.each([
      [
        'exists',
        { key: 'ticket_type', op: 'exists' },
        'ticket.type and ticket.type != ""'
      ],
      [
        'equals text',
        { key: 'ticket_type', op: 'equals', value: 'VIP' },
        'ticket.type == "VIP"'
      ],
      [
        'equals a number',
        { key: 'tickets_left', op: 'equals', value: 0 },
        'event.tickets_left == 0'
      ],
      [
        'notEquals',
        { key: 'ticket_type', op: 'notEquals', value: 'VIP' },
        'ticket.type != "VIP"'
      ],
      ['lessThan', nearlySoldOut, 'event.tickets_left < 20'],
      [
        'greaterThan',
        { key: 'tickets_left', op: 'greaterThan', value: -1.5 },
        'event.tickets_left > -1.5'
      ]
    ])(
      'wraps a block shown when it %s in a Liquid if',
      async (_name, rule, condition) => {
        const { html, text: plain } = await liquid(offer(rule))
        expect(html).toContain(`{% if ${condition} %}`)
        expect(html.indexOf(`{% if ${condition} %}`)).toBeLessThan(
          html.indexOf('Grab the last few')
        )
        expect(html.indexOf('{% endif %}')).toBeGreaterThan(
          html.indexOf('Grab the last few')
        )
        expect(plain).toBe(
          `Before\n\n{%- if ${condition} %}\n\nGrab the last few [${tickets}]\n\n{%- endif %}\n\nAfter`
        )
      }
    )

    it('leaves the email whole when a sender hides the block', async () => {
      const { html } = await liquid(offer(nearlySoldOut))
      const without = await liquid(email(p(text('Before')), p(text('After'))))
      expect(hidden(html)).toBe(hidden(without.html))
    })

    it('leaves the email whole when a sender hides a section', async () => {
      const { html, text: plain } = await liquid(
        email(
          when(section(p(text('Only 20 tickets left'))), nearlySoldOut),
          p(text('After'))
        )
      )
      const without = await liquid(email(p(text('After'))))
      expect(html).toContain('{% if event.tickets_left < 20 %}')
      expect(hidden(html)).toBe(hidden(without.html))
      expect(plain).toBe(
        '{%- if event.tickets_left < 20 -%}Only 20 tickets left\n\n{%- endif %}\n\nAfter'
      )
    })

    it('starts the plain text at the words of a first block that shows', async () => {
      const lastFew = email(
        when(section(p(text('Only 20 tickets left'))), nearlySoldOut),
        p(text('After'))
      )
      const { text: plain } = await liquid(lastFew)
      // What a Liquid sender does with whitespace control and a rule that holds.
      const shown = plain
        .replace(/\s*\{%-/g, '{%')
        .replace(/-%\}\s*/g, '%}')
        .replace(/\{%[^%]*%\}/g, '')
      expect(shown).toBe('Only 20 tickets left\n\nAfter')
      const preview = await renderEmail(lastFew, {
        variables,
        values: { tickets_left: '3' }
      })
      expect(preview.text).toBe('Only 20 tickets left\n\nAfter')
    })

    it('leaves the columns whole when a sender hides a block in one', async () => {
      const row = (...first: JSONContent[]) =>
        email(columns(column(...first), column(p(text('Stage 2')))))
      const { html } = await liquid(
        row(p(text('Stage 1')), when(image(poster), nearlySoldOut))
      )
      const without = await liquid(row(p(text('Stage 1'))))
      expect(html).toContain('{% if event.tickets_left < 20 %}')
      expect(hidden(html)).toBe(hidden(without.html))
    })

    it.each([
      ['text with a double quote', 'The "Gold" pass', `'The "Gold" pass'`],
      ['text with a single quote', "Rock 'n' roll", `"Rock 'n' roll"`],
      ['markup, unescaped', '<b>VIP & co</b>', '"<b>VIP & co</b>"']
    ])('writes %s as a Liquid string', async (_name, value, literal) => {
      const { html } = await liquid(
        offer({ key: 'ticket_type', op: 'equals', value })
      )
      expect(html).toContain(`{% if ticket.type == ${literal} %}`)
    })

    it.each([
      ['both quotes', `The "Gold" pass's`],
      ['the end of a tag', 'VIP %} {% include "x" %}']
    ])(
      'refuses text with %s, which a Liquid string can’t hold',
      async (_name, value) => {
        await expect(
          liquid(offer({ key: 'ticket_type', op: 'equals', value }))
        ).rejects.toThrow(RangeError)
      }
    )

    it('refuses a number Liquid can’t write', async () => {
      await expect(
        liquid(offer({ key: 'tickets_left', op: 'lessThan', value: 1e21 }))
      ).rejects.toThrow(RangeError)
    })

    it('refuses a variable whose Liquid token has a filter', async () => {
      await expect(
        liquid(offer({ key: 'event_date', op: 'exists' }))
      ).rejects.toThrow('"event_date"')
    })

    it.each(['{{ empty }}', '{{ and }}', '{{ true.x }}'])(
      'refuses a variable whose Liquid token %s is a keyword',
      async (liquidToken) => {
        await expect(
          renderEmail(offer({ key: 'odd', op: 'exists' }), {
            syntax: 'liquid',
            variables: [
              { key: 'odd', label: 'Odd', tokens: { liquid: liquidToken } }
            ]
          })
        ).rejects.toThrow('"odd"')
      }
    )

    it.each(['0x10', '1e1', ' '])(
      'reads %j as no number in a preview, as Liquid does',
      async (tickets_left) => {
        const { text: plain } = await renderEmail(
          offer({ key: 'tickets_left', op: 'greaterThan', value: 0 }),
          { variables, values: { tickets_left } }
        )
        expect(plain).toBe('Before\n\nAfter')
      }
    )

    it('refuses a variable with no Liquid token', async () => {
      await expect(
        liquid(offer({ key: 'first_name', op: 'exists' }))
      ).rejects.toThrow('"first_name" has no liquid token')
    })

    it('refuses a rule the app’s variables don’t list', async () => {
      await expect(
        renderEmail(offer({ key: 'capacity', op: 'exists' }), {
          variables,
          values: {}
        })
      ).rejects.toThrow('"capacity"')
    })

    it('refuses conditions in the AE syntax, which has none', async () => {
      await expect(
        renderEmail(offer({ key: 'ticket_type', op: 'exists' }), {
          syntax: 'ae',
          variables
        })
      ).rejects.toThrow(TypeError)
    })

    it('refuses conditions with neither a syntax nor values', async () => {
      await expect(
        renderEmail(offer(nearlySoldOut), { variables })
      ).rejects.toThrow(TypeError)
    })

    it.each([
      [
        'exists',
        { key: 'ticket_type', op: 'exists' },
        { ticket_type: 'VIP' },
        { ticket_type: '' }
      ],
      [
        'exists, reading false as Liquid does',
        { key: 'ticket_type', op: 'exists' },
        { ticket_type: 'true' },
        { ticket_type: 'false' }
      ],
      [
        'equals text',
        { key: 'ticket_type', op: 'equals', value: 'VIP' },
        { ticket_type: 'VIP' },
        { ticket_type: 'vip' }
      ],
      [
        'equals a number',
        { key: 'tickets_left', op: 'equals', value: 0 },
        { tickets_left: '0' },
        { tickets_left: '' }
      ],
      [
        'notEquals',
        { key: 'ticket_type', op: 'notEquals', value: 'VIP' },
        {},
        { ticket_type: 'VIP' }
      ],
      [
        'lessThan',
        nearlySoldOut,
        { tickets_left: '19.5' },
        { tickets_left: '20' }
      ],
      [
        'lessThan, with no number',
        nearlySoldOut,
        { tickets_left: '3' },
        { tickets_left: 'few' }
      ],
      [
        'greaterThan',
        { key: 'tickets_left', op: 'greaterThan', value: 0 },
        { tickets_left: '1' },
        {}
      ]
    ])(
      'shows or hides a block that %s in a preview',
      async (_name, rule, shown, hiddenBy) => {
        const read = async (values: Record<string, string>) =>
          (await renderEmail(offer(rule), { variables, values })).text
        expect(await read(shown)).toBe(
          `Before\n\nGrab the last few [${tickets}]\n\nAfter`
        )
        expect(await read(hiddenBy)).toBe('Before\n\nAfter')
      }
    )

    it('compares a preview’s false as Liquid’s false, which no text equals', async () => {
      const read = async (op: 'equals' | 'notEquals') =>
        (
          await renderEmail(offer({ key: 'ticket_type', op, value: 'false' }), {
            variables,
            values: { ticket_type: 'false' }
          })
        ).text
      expect(await read('equals')).toBe('Before\n\nAfter')
      expect(await read('notEquals')).toBe(
        `Before\n\nGrab the last few [${tickets}]\n\nAfter`
      )
    })

    it('checks a rule keyed like an object’s own property from values alone', async () => {
      const keyed: EditorVariable[] = [
        { key: 'constructor', label: 'Constructor', tokens: {} }
      ]
      const { text: plain } = await renderEmail(
        offer({ key: 'constructor', op: 'exists' }),
        { variables: keyed, values: {} }
      )
      expect(plain).toBe('Before\n\nAfter')
    })

    it.each([
      [
        'a variable',
        p(text('Hi '), { type: 'variable', attrs: { key: 'capacity' } })
      ],
      ['a rule', when(button(tickets), { key: 'capacity', op: 'exists' })]
    ])(
      'refuses %s the app’s variables don’t list in a section a preview hides',
      async (_name, inner) => {
        await expect(
          renderEmail(email(when(section(inner), nearlySoldOut)), {
            variables,
            values: { tickets_left: '200' }
          })
        ).rejects.toThrow('"capacity"')
      }
    )

    it('hides a section and everything in it in a preview', async () => {
      const { html, text: plain } = await renderEmail(
        email(
          when(
            section(p(text('Only 20 tickets left')), button(tickets)),
            nearlySoldOut
          ),
          p(text('After'))
        ),
        { variables, values: { tickets_left: '200' } }
      )
      expect(html).not.toContain('Only 20 tickets left')
      expect(html).not.toContain(tickets)
      expect(plain).toBe('After')
    })

    it('writes no empty row for a run whose blocks are all hidden in a preview', async () => {
      const preview = (...content: JSONContent[]) =>
        renderEmail(email(...content), {
          variables,
          values: { tickets_left: '200' }
        })
      const { html } = await preview(
        when(button(tickets), nearlySoldOut),
        section(p(text('After')))
      )
      const without = await preview(section(p(text('After'))))
      expect(body(html)).toBe(body(without.html))
    })

    it('renders a block with no rule as it was', async () => {
      const { html } = await renderEmail(email(button(tickets)))
      expect(html).not.toContain('{%')
    })
  })
})

describe('renderEmail with HTML', () => {
  const pasted = [
    '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    '<!--[if mso]><table role="presentation"><tr><td><![endif]-->',
    '<table width="600"><tr><td><font face="Arial" color="#333333">',
    'Hi #FirstName#, {{ first_name }} &amp; friends,</font>',
    `<p><a href="${tickets}" data-tracking="||CampaignId||">Get tickets</a></p>`,
    `<img src="${poster}" alt="The crowd at sunset">`,
    '</td></tr></table>',
    '<!--[if mso]></td></tr></table><![endif]-->',
    '</body></html>'
  ].join('\n')

  it('sends the HTML as written, merge tags and Outlook blocks included', async () => {
    const { html } = await renderEmail({ kind: 'html', html: pasted })
    expect(html).toBe(pasted)
  })

  it('sends the HTML as written whatever the merge tag options', async () => {
    const { html } = await renderEmail(
      { kind: 'html', html: pasted },
      {
        syntax: 'liquid',
        variables: [],
        values: { first_name: 'Ashley' }
      }
    )
    expect(html).toBe(pasted)
  })

  it('writes the plain text from the HTML, with links and without images', async () => {
    const { text: plain } = await renderEmail({ kind: 'html', html: pasted })
    expect(plain).toBe(
      [
        'Hi #FirstName#, {{ first_name }} & friends,',
        '',
        `Get tickets [${tickets}]`
      ].join('\n')
    )
  })

  it.each(['h1', 'h5', 'h6'])(
    'keeps the case of a %s and its merge tags in the plain text',
    async (tag) => {
      const { text: plain } = await renderEmail({
        kind: 'html',
        html: `<table><tr><${tag}>Hi {{ first_name }}, #FirstName#</${tag}></tr></table>`
      })
      expect(plain).toBe('Hi {{ first_name }}, #FirstName#')
    }
  )

  it.each(['td', 'th'])(
    'keeps the %s cells of a layout table apart in the plain text',
    async (cell) => {
      const { text: plain } = await renderEmail({
        kind: 'html',
        html: `<table><tr><${cell}>Doors open 7pm</${cell}><${cell}>Tickets from $49</${cell}></tr></table>`
      })
      expect(plain).toBe('Doors open 7pm\n\nTickets from $49')
    }
  )

  it('refuses content of another kind', async () => {
    await expect(
      // @ts-expect-error A kind read back from storage can be anything.
      renderEmail({ kind: 'mjml', html: pasted })
    ).rejects.toThrow(TypeError)
  })

  it('refuses HTML content without its HTML', async () => {
    await expect(
      // @ts-expect-error Content read back from storage can be missing a field.
      renderEmail({ kind: 'html' })
    ).rejects.toThrow(TypeError)
  })
})
