import { describe, expect, it } from 'vitest'

import type { EditorVariable, JSONContent, StoredEditorValue } from '../schema'
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
    const liquid = (value: StoredEditorValue) =>
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
        '{%- if event.tickets_left < 20 %}\n\nOnly 20 tickets left\n\n{%- endif %}\n\nAfter'
      )
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

    it('renders a block with no rule as it was', async () => {
      const { html } = await renderEmail(email(button(tickets)))
      expect(html).not.toContain('{%')
    })
  })
})
