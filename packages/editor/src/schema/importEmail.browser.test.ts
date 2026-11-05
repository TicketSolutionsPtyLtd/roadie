import { describe, expect, it } from 'vitest'

import { type MjmlNode, mjmlTree } from '../email/mjmlTree'
import { defaultEmailTheme } from '../email/theme'
import {
  type EditorVariable,
  type JSONContent,
  emailSourceFormat,
  importEmail,
  migrate
} from './index'

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks && { marks })
})
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  content
})
const variable = (key: string, fallback?: string): JSONContent => ({
  type: 'variable',
  attrs: { key, ...(fallback && { fallback }) }
})

const variables: EditorVariable[] = [
  {
    key: 'first_name',
    label: 'First name',
    tokens: { ae: '#FirstName#', liquid: '{{ customer.first_name }}' }
  },
  {
    key: 'unsubscribe_url',
    label: 'Unsubscribe page',
    kind: 'url',
    tokens: { ae: '#OptOut#', liquid: '{{ unsubscribe_url }}' }
  }
]

const mjml = (body: string, head = '') =>
  `<mjml>${head && `<mj-head>${head}</mj-head>`}<mj-body>${body}</mj-body></mjml>`

const blocks = (source: string) =>
  importEmail(source, { variables }).value.doc.content

describe('emailSourceFormat', () => {
  it.each([
    ['an mjml root', '<mjml><mj-body></mj-body></mjml>', 'mjml'],
    ['an mjml root in capitals', '<MJML></MJML>', 'mjml'],
    [
      'an mjml root after a declaration and a comment',
      '﻿ <?xml version="1.0"?>\n<!-- Promo -->\n<mjml></mjml>',
      'mjml'
    ],
    ['a whole page', '<!doctype html><html><body>Hi</body></html>', 'html'],
    ['a fragment', '<p>Hi</p>', 'html'],
    ['plain text', 'Doors 7pm', 'html']
  ])('reads %s', (_, source, format) => {
    expect(emailSourceFormat(source)).toBe(format)
  })
})

describe('importEmail from MJML', () => {
  it('reads a one-column section as blocks at the top', () => {
    const imported = importEmail(
      mjml(`<mj-section><mj-column>
        <mj-image src="https://cdn.oztix.com.au/hero.jpg" alt="The crowd" width="300px" />
        <mj-text><h2>Doors 7pm</h2><p>All <strong>ages</strong></p></mj-text>
        <mj-button href="https://www.oztix.com.au/tickets">Get tickets</mj-button>
        <mj-spacer height="40px" />
        <mj-divider />
      </mj-column></mj-section>`)
    )

    expect(imported.format).toBe('mjml')
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: 'The crowd',
          width: 300
        }
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [text('Doors 7pm')]
      },
      paragraph(text('All '), text('ages', [{ type: 'bold' }])),
      {
        type: 'button',
        attrs: { href: 'https://www.oztix.com.au/tickets' },
        content: [text('Get tickets')]
      },
      { type: 'spacer', attrs: { height: 40 } },
      { type: 'horizontalRule' }
    ])
    expect(imported.dropped).toEqual([])
    expect(imported.restyled).toEqual({ styles: 0, tables: 0 })
  })

  it('reads two to four columns as columns', () => {
    expect(
      blocks(
        mjml(`<mj-section>
          <mj-column><mj-text>Doors</mj-text></mj-column>
          <mj-group><mj-column><mj-text>7pm</mj-text></mj-column><mj-column><mj-text>All ages</mj-text></mj-column></mj-group>
        </mj-section>`)
      )
    ).toEqual([
      {
        type: 'columns',
        content: [
          { type: 'column', content: [paragraph(text('Doors'))] },
          { type: 'column', content: [paragraph(text('7pm'))] },
          { type: 'column', content: [paragraph(text('All ages'))] }
        ]
      }
    ])
  })

  it('reads a wrapper as a section, and a hero as one', () => {
    expect(
      blocks(
        mjml(`<mj-wrapper>
          <mj-section><mj-column><mj-text>Doors</mj-text></mj-column></mj-section>
          <mj-section><mj-column><mj-text>7pm</mj-text></mj-column><mj-column><mj-text>9pm</mj-text></mj-column></mj-section>
        </mj-wrapper>
        <mj-hero><mj-text>All ages</mj-text></mj-hero>`)
      )
    ).toEqual([
      {
        type: 'section',
        content: [
          paragraph(text('Doors')),
          {
            type: 'columns',
            content: [
              { type: 'column', content: [paragraph(text('7pm'))] },
              { type: 'column', content: [paragraph(text('9pm'))] }
            ]
          }
        ]
      },
      { type: 'section', content: [paragraph(text('All ages'))] }
    ])
  })

  it('reads a button’s alignment and full width', () => {
    expect(
      blocks(
        mjml(`<mj-section><mj-column>
          <mj-button href="https://www.oztix.com.au" align="center">Centred</mj-button>
          <mj-button href="https://www.oztix.com.au" width="100%" align="left">Full</mj-button>
        </mj-column></mj-section>`)
      )
    ).toEqual([
      {
        type: 'button',
        attrs: { href: 'https://www.oztix.com.au', align: 'center' },
        content: [text('Centred')]
      },
      {
        type: 'button',
        attrs: { href: 'https://www.oztix.com.au', fullWidth: true },
        content: [text('Full')]
      }
    ])
  })

  it('reports what it drops, keeping text', () => {
    const imported = importEmail(
      mjml(
        `<mj-section background-color="#000"><mj-column>
          <mj-image src="http://cdn.oztix.com.au/old.jpg" />
          <mj-image src="https://cdn.oztix.com.au/poster.jpg" href="https://www.oztix.com.au" />
          <mj-text color="#e00" font-size="20px">Sold <span style="color:red">out</span></mj-text>
          <mj-table><tr><td>Doors</td><td>7pm</td></tr></mj-table>
          <mj-accordion><mj-accordion-element><mj-accordion-title>Parking</mj-accordion-title><mj-accordion-text>On site</mj-accordion-text></mj-accordion-element></mj-accordion>
        </mj-column></mj-section>`,
        '<mj-preview>Two weeks to go</mj-preview><mj-style>.x { color: red }</mj-style>'
      )
    )

    expect(imported.dropped).toEqual([
      { kind: 'hidden' },
      { kind: 'image', src: 'http://cdn.oztix.com.au/old.jpg' },
      { kind: 'link', src: 'https://www.oztix.com.au' },
      { kind: 'element', tag: 'mj-accordion' }
    ])
    // The sheet, the section, the text block and its span.
    expect(imported.restyled).toEqual({ styles: 4, tables: 1 })
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/poster.jpg',
          alt: '',
          width: null
        }
      },
      paragraph(text('Sold out')),
      paragraph(text('Doors')),
      paragraph(text('7pm')),
      paragraph(text('Parking')),
      paragraph(text('On site'))
    ])
  })

  it('reads a protocol-relative image as https, as HTML does', () => {
    const imported = importEmail(
      mjml(
        '<mj-section><mj-column><mj-image src="//cdn.oztix.com.au/hero.jpg" /></mj-column></mj-section>'
      )
    )

    expect(imported.dropped).toEqual([])
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: '',
          width: null
        }
      }
    ])
  })

  it('reads a button with no address a mail client opens as its own line', () => {
    const imported = importEmail(
      mjml(`<mj-section><mj-column>
        <mj-button href="/tickets">Get tickets</mj-button>
        <mj-button>Doors 7pm</mj-button>
        <mj-button href="#FirstName#">Hi</mj-button>
        <mj-button href="#OptOut#">Unsubscribe</mj-button>
      </mj-column></mj-section>`),
      { variables }
    )

    expect(imported.dropped).toEqual([
      { kind: 'element', tag: 'mj-button' },
      { kind: 'element', tag: 'mj-button' },
      { kind: 'element', tag: 'mj-button' }
    ])
    expect(imported.value.doc.content).toEqual([
      paragraph(
        text('Get tickets', [{ type: 'link', attrs: { href: '/tickets' } }])
      ),
      paragraph(text('Doors 7pm')),
      paragraph(text('Hi', [{ type: 'link', attrs: { href: '#FirstName#' } }])),
      {
        type: 'button',
        attrs: { variable: 'unsubscribe_url' },
        content: [text('Unsubscribe')]
      }
    ])
  })

  it('reads a navbar and social links as a line of links', () => {
    const link = (href: string) => [{ type: 'link', attrs: { href } }]
    expect(
      blocks(
        mjml(`<mj-section><mj-column>
          <mj-navbar><mj-navbar-link href="https://www.oztix.com.au/events">Events</mj-navbar-link><mj-navbar-link href="https://www.oztix.com.au/help">Help</mj-navbar-link></mj-navbar>
          <mj-social><mj-social-element name="instagram" href="https://instagram.com/oztix">Instagram</mj-social-element></mj-social>
        </mj-column></mj-section>`)
      )
    ).toEqual([
      paragraph(
        text('Events', link('https://www.oztix.com.au/events')),
        text(' · '),
        text('Help', link('https://www.oztix.com.au/help'))
      ),
      paragraph(text('Instagram', link('https://instagram.com/oztix')))
    ])
  })

  it('reads merge tags in text, a button’s label and its link', () => {
    expect(
      blocks(
        mjml(`<mj-section><mj-column>
          <mj-text>Hi {{customer.first_name | default: "there"}}, and #FirstName#</mj-text>
          <mj-button href="{{ unsubscribe_url }}">Bye {{ customer.first_name }}</mj-button>
        </mj-column></mj-section>`)
      )
    ).toEqual([
      paragraph(
        text('Hi '),
        variable('first_name', 'there'),
        text(', and '),
        variable('first_name')
      ),
      {
        type: 'button',
        attrs: { variable: 'unsubscribe_url' },
        content: [text('Bye '), variable('first_name')]
      }
    ])
  })

  it('reads back what the email renderer writes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://cdn.oztix.com.au/hero.jpg',
            alt: 'Hero',
            width: 600
          }
        },
        {
          type: 'section',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [text('Doors 7pm')]
            },
            paragraph(text('Hi '), variable('first_name', 'there'), text('.')),
            {
              type: 'button',
              attrs: { href: 'https://www.oztix.com.au', align: 'center' },
              content: [text('Get tickets')]
            },
            {
              type: 'columns',
              content: [
                { type: 'column', content: [paragraph(text('Doors'))] },
                { type: 'column', content: [paragraph(text('7pm'))] }
              ]
            }
          ]
        },
        { type: 'spacer', attrs: { height: 48 } },
        { type: 'horizontalRule' },
        paragraph(
          text('Unsubscribe', [
            { type: 'link', attrs: { variable: 'unsubscribe_url' } }
          ])
        )
      ]
    }
    const tokens: Record<string, string> = {
      first_name: '{{ customer.first_name | default: "there" }}',
      unsubscribe_url: '{{ unsubscribe_url }}'
    }
    const tree = mjmlTree(doc, {
      theme: defaultEmailTheme,
      tag: ({ key }) => tokens[String(key)]!,
      linkTag: (key) => tokens[key],
      showsWhen: () => true
    })

    const imported = importEmail(asMjml(tree), { variables })

    expect(imported.value.doc).toEqual(
      migrate({ version: 1, preset: 'email', doc }, 'email').doc
    )
    expect(imported.dropped).toEqual([])
    expect(imported.unknownMergeTags).toEqual([])
  })
})

describe('importEmail from HTML', () => {
  const crusader = `<!DOCTYPE html><html><head><title>Promo</title>
    <style>td { font-family: Arial }</style></head>
    <body style="margin:0">
    <div style="display:none;max-height:0">Two weeks to go</div>
    <table width="600" align="center"><tr><td>
      <img src="https://cdn.oztix.com.au/hero.jpg" alt="Hero" width="600">
    </td></tr><tr><td style="padding:24px">
      <h1>Doors 7pm</h1>
      <p>Hi #FirstName#, see you there.</p>
      <p><a href="#OptOut#">Unsubscribe</a> or reply to #Promoter#.</p>
    </td></tr></table></body></html>`

  it('keeps a table layout’s images and text, and reads its merge tags', () => {
    const imported = importEmail(crusader, { variables })

    expect(imported.format).toBe('html')
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: 'Hero',
          width: 600
        }
      },
      { type: 'heading', attrs: { level: 2 }, content: [text('Doors 7pm')] },
      paragraph(text('Hi '), variable('first_name'), text(', see you there.')),
      paragraph(
        text('Unsubscribe', [
          { type: 'link', attrs: { variable: 'unsubscribe_url' } }
        ]),
        text(' or reply to #Promoter#.')
      )
    ])
  })

  it('reports hidden text, styles, tables and unknown merge tags', () => {
    const { dropped, restyled, unknownMergeTags } = importEmail(crusader, {
      variables
    })

    expect(dropped).toEqual([{ kind: 'hidden' }])
    // The sheet, the body and the cell; the hidden div goes with its text.
    expect(restyled).toEqual({ styles: 3, tables: 1 })
    expect(unknownMergeTags).toEqual(['#Promoter#'])
  })

  it('reads tokens as text without variables, listing each once', () => {
    const imported = importEmail(
      '<p>Hi #FirstName# and {{ x }}, {{ x }} [ViewInBrowserLink] [1]</p>'
    )

    expect(imported.value.doc.content).toEqual([
      paragraph(
        text('Hi #FirstName# and {{ x }}, {{ x }} [ViewInBrowserLink] [1]')
      )
    ])
    expect(imported.unknownMergeTags).toEqual([
      '#FirstName#',
      '{{ x }}',
      '[ViewInBrowserLink]'
    ])
  })

  it('reports a link around an image, keeping the image', () => {
    const imported = importEmail(
      '<a href="https://www.oztix.com.au"><img src="https://cdn.oztix.com.au/hero.jpg" alt="Hero"></a>'
    )

    expect(imported.dropped).toEqual([
      { kind: 'link', src: 'https://www.oztix.com.au' }
    ])
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: 'Hero',
          width: null
        }
      }
    ])
  })

  it('reports a link around a protocol-relative image it keeps', () => {
    const imported = importEmail(
      '<a href="https://www.oztix.com.au"><img src="//cdn.oztix.com.au/hero.jpg" alt=""></a>'
    )

    expect(imported.dropped).toEqual([
      { kind: 'link', src: 'https://www.oztix.com.au' }
    ])
    expect(imported.value.doc.content).toEqual([
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: '',
          width: null
        }
      }
    ])
  })

  it('leaves a token inside a longer link as it is', () => {
    expect(
      blocks('<p><a href="https://oztix.com.au/?n=#FirstName#">Tickets</a></p>')
    ).toEqual([
      paragraph(
        text('Tickets', [
          {
            type: 'link',
            attrs: { href: 'https://oztix.com.au/?n=#FirstName#' }
          }
        ])
      )
    ])
  })
})

describe('importEmail with unsafe source', () => {
  it('keeps no script, handler, or javascript: link', () => {
    const imported = importEmail(
      mjml(`<mj-section><mj-column>
        <mj-button href="javascript:alert(1)">Get tickets</mj-button>
        <mj-navbar><mj-navbar-link href="javascript:alert(1)">Home</mj-navbar-link></mj-navbar>
        <mj-image src="https://cdn.oztix.com.au/hero.jpg" onerror="alert(1)" />
        <mj-raw><script>alert(1)</script><a href=" JaVaScRiPt:alert(1)" onclick="alert(1)">Lineup</a></mj-raw>
      </mj-column></mj-section>`)
    )

    expect(imported.value.doc.content).toEqual([
      paragraph(text('Get tickets')),
      paragraph(text('Home')),
      {
        type: 'image',
        attrs: {
          src: 'https://cdn.oztix.com.au/hero.jpg',
          alt: '',
          width: null
        }
      },
      paragraph(text('Lineup'))
    ])
  })

  it('reports an image on a path of the site, which an email can’t load', () => {
    const imported = importEmail('<p>Doors</p><img src="/poster.jpg" alt="">')

    expect(imported.dropped).toEqual([{ kind: 'image', src: '/poster.jpg' }])
    expect(imported.value.doc.content).toEqual([paragraph(text('Doors'))])
  })

  it('counts a hero’s background as a style, not an image off https', () => {
    const imported = importEmail(
      mjml(
        '<mj-hero background-url="https://cdn.oztix.com.au/hero.jpg"><mj-text>All ages</mj-text></mj-hero>'
      )
    )

    expect(imported.dropped).toEqual([])
    expect(imported.restyled).toEqual({ styles: 1, tables: 0 })
  })

  it('reads no merge tags in a script, and counts a sheet in MJML text', () => {
    const html = importEmail(
      '<p>Hi</p><script>const name = "{{ customer.name }}"</script>'
    )
    const fromMjml = importEmail(
      mjml(
        '<mj-section><mj-column><mj-raw><style>.cta { color: red }</style></mj-raw><mj-text>Hi</mj-text></mj-column></mj-section>'
      )
    )

    expect(html.unknownMergeTags).toEqual([])
    expect(fromMjml.restyled).toEqual({ styles: 1, tables: 0 })
  })

  it('reads an element named like an object key as any other', () => {
    expect(
      blocks(
        mjml(
          '<mj-section><mj-column><constructor title="Doors">Doors</constructor></mj-column></mj-section>'
        )
      )
    ).toEqual([paragraph(text('Doors'))])
  })
})

// MJML's own reader takes XML; this writes its JSON tree as that.
function asMjml({ tagName, attributes, children, content }: MjmlNode): string {
  const attrs = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('')
  const inner = content ?? (children ?? []).map(asMjml).join('')
  return `<${tagName}${attrs}>${inner}</${tagName}>`
}
