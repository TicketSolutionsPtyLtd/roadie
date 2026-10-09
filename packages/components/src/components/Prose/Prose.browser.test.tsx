import type { ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Prose } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  document.documentElement.classList.remove('dark')
  cleanup()
})

const LONG =
  'Gates open at 11am on Saturday at Jumbuck Orchard Park. Bring a printed or mobile ticket, photo ID for the bar, sunscreen, and a refillable bottle, and check the set times before you travel.'

const DISPLAY_UI = [
  'text-display-ui-1',
  'text-display-ui-2',
  'text-display-ui-3',
  'text-display-ui-4',
  'text-display-ui-5',
  'text-display-ui-6'
] as const
const DISPLAY_PROSE = [
  'text-display-prose-1',
  'text-display-prose-2',
  'text-display-prose-3',
  'text-display-prose-4',
  'text-display-prose-5',
  'text-display-prose-6'
] as const

const style = (element: Element) => getComputedStyle(element)
const box = (element: Element) => element.getBoundingClientRect()
const px = (value: string) => Number.parseFloat(value)
const get = (container: HTMLElement, selector: string) =>
  container.querySelector(selector)!

function renderWide(children: ReactNode, width = 1400) {
  return render(<div style={{ width }}>{children}</div>).container
}

// A 65ch box at the prose body size, which is where the measure resolves.
function measureOf(prose: Element) {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;width:65ch'
  prose.append(probe)
  const width = box(probe).width
  probe.remove()
  return width
}

describe('Prose', () => {
  it('sets the first child flush with the top, nested ones too', () => {
    const container = renderWide(
      <Prose>
        <h2 id='first'>Ochre Kite Weekender 2026</h2>
        <blockquote>
          <p id='nested'>Re-entry closes at 9pm.</p>
        </blockquote>
      </Prose>
    )
    expect(style(get(container, '#first')).marginTop).toBe('0px')
    expect(style(get(container, '#nested')).marginTop).toBe('0px')
    expect(style(get(container, 'blockquote')).marginTop).not.toBe('0px')
  })

  it.each([
    ['sm', 14, 1],
    ['md', 16, 1.25],
    ['lg', 18, 1.25]
  ] as const)(
    'spaces %s paragraphs by the flow',
    (size, minimumFontSize, flowEm) => {
      const container = renderWide(
        <Prose size={size}>
          <p id='a'>Doors 7pm.</p>
          <p id='b'>General admission, standing.</p>
        </Prose>
      )
      const fontSize = px(style(get(container, '#b')).fontSize)
      expect(fontSize).toBeGreaterThanOrEqual(minimumFontSize)
      if (size !== 'lg') expect(fontSize).toBe(minimumFontSize)
      const gap =
        box(get(container, '#b')).top - box(get(container, '#a')).bottom
      expect(gap).toBeCloseTo(fontSize * flowEm, 1)
    }
  )

  it.each(['sm', 'md', 'lg'] as const)(
    'gives a %s h2 more space above than below',
    (size) => {
      const container = renderWide(
        <Prose size={size}>
          <p id='before'>Doors 7pm.</p>
          <h2 id='heading'>What to bring</h2>
          <p id='after'>Pack light.</p>
        </Prose>
      )
      const heading = box(get(container, '#heading'))
      const above = heading.top - box(get(container, '#before')).bottom
      const below = box(get(container, '#after')).top - heading.bottom
      expect(below).toBeGreaterThan(0)
      expect(above).toBeGreaterThan(below)
    }
  )

  it('spaces a heading by the same multiple of the body flow at every size', () => {
    const ratios = (['sm', 'md', 'lg'] as const).map((size) => {
      const container = renderWide(
        <Prose size={size}>
          <p id='a'>Doors 7pm.</p>
          <p id='b'>General admission, standing.</p>
          <h2 id='heading'>What to bring</h2>
        </Prose>
      )
      const flow =
        box(get(container, '#b')).top - box(get(container, '#a')).bottom
      const above =
        box(get(container, '#heading')).top - box(get(container, '#b')).bottom
      cleanup()
      return above / flow
    })
    expect(ratios[0]).toBeGreaterThan(1)
    expect(ratios[1]).toBeCloseTo(ratios[0]!, 2)
    expect(ratios[2]).toBeCloseTo(ratios[0]!, 2)
  })

  it('keeps the space around a heading when its size changes', () => {
    const space = (className?: string) => {
      const container = renderWide(
        <Prose className={className}>
          <p id='before'>Doors 7pm.</p>
          <h2 id='heading'>What to bring</h2>
          <p id='after'>Pack light.</p>
        </Prose>
      )
      const heading = box(get(container, '#heading'))
      const result = {
        size: px(style(get(container, '#heading')).fontSize),
        above: heading.top - box(get(container, '#before')).bottom,
        below: box(get(container, '#after')).top - heading.bottom
      }
      cleanup()
      return result
    }
    const normal = space()
    const large = space('[--prose-h2-size:5rem]')
    expect(large.size).toBeGreaterThan(normal.size)
    expect(large.above).toBeCloseTo(normal.above, 1)
    expect(large.below).toBeCloseTo(normal.below, 1)
  })

  it.each([
    ['sm', 'ui', DISPLAY_UI],
    ['md', 'prose', DISPLAY_PROSE],
    ['lg', 'prose', DISPLAY_PROSE]
  ] as const)(
    'sets %s headings to the display-%s scale',
    (size, _, display) => {
      const container = renderWide(
        <>
          <Prose size={size}>
            <h1>Set times</h1>
            <h2>Set times</h2>
            <h3>Set times</h3>
            <h4>Set times</h4>
            <h5>Set times</h5>
            <h6>Set times</h6>
          </Prose>
          {display.map((className) => (
            <p key={className} className={className}>
              Set times
            </p>
          ))}
        </>
      )
      display.forEach((className, index) => {
        const heading = style(get(container, `h${index + 1}`))
        const reference = style(get(container, `.${className}`))
        expect(heading.fontSize, className).toBe(reference.fontSize)
        expect(heading.fontWeight, className).toBe(reference.fontWeight)
      })
    }
  )

  it('lets a variable on Prose override its size', () => {
    const container = renderWide(
      <Prose size='lg' className='[--prose-size:2rem]'>
        <p id='body'>Doors 7pm.</p>
      </Prose>
    )
    expect(style(get(container, '#body')).fontSize).toBe('32px')
  })

  it('caps a child at 65ch, and a bleed child runs past it', () => {
    const container = renderWide(
      <Prose>
        <p id='capped'>{LONG}</p>
        <p id='bleed' className='prose-bleed'>
          {LONG}
        </p>
      </Prose>
    )
    const prose = get(container, '[data-slot="prose"]')
    const measure = measureOf(prose)
    expect(measure).toBeLessThan(box(prose).width)
    expect(box(get(container, '#capped')).width).toBeCloseTo(measure, 0)
    expect(box(get(container, '#bleed')).width).toBeGreaterThan(measure)
  })

  it.each([
    ['class', { className: 'not-prose' }],
    ['attribute', { 'data-not-prose': '' }]
  ])('leaves a subtree escaped by %s with its own styles', (_, escape) => {
    const container = renderWide(
      <Prose>
        <p>Typeset.</p>
        <div {...escape}>
          <ul id='list'>
            <li>
              <a id='link' href='#tickets'>
                Tickets
              </a>
            </li>
          </ul>
          <h2 id='heading'>Not a prose heading</h2>
        </div>
      </Prose>
    )
    const list = style(get(container, '#list'))
    expect(list.listStyleType).toBe('none')
    expect(list.paddingInlineStart).toBe('0px')
    expect(list.marginTop).toBe('0px')
    expect(style(get(container, '#link')).textDecorationLine).toBe('none')
    expect(style(get(container, '#heading')).fontWeight).not.toBe('800')
  })

  it('lets a utility on a child win over the sheet', () => {
    const container = renderWide(
      <Prose>
        <p>Doors 7pm.</p>
        <p id='spaced' className='mt-12 text-subtle'>
          General admission.
        </p>
        <p>
          <a id='plain' className='no-underline' href='#tickets'>
            Tickets
          </a>
        </p>
      </Prose>
    )
    const spaced = get(container, '#spaced')
    expect(style(spaced).marginTop).toBe('48px')
    expect(style(spaced).color).not.toBe(
      style(get(container, '[data-slot="prose"]')).color
    )
    expect(style(get(container, '#plain')).textDecorationLine).toBe('none')
  })

  it('shrinks a table to fit and scrolls a wide one in .prose-scroll', () => {
    const container = renderWide(
      <Prose>
        <table id='small'>
          <tbody>
            <tr>
              <td>Main</td>
              <td>7:30pm</td>
            </tr>
          </tbody>
        </table>
        <div id='scroll' className='prose-scroll'>
          <table>
            <tbody>
              <tr>
                {Array.from({ length: 12 }, (_, index) => (
                  <td key={index} className='whitespace-nowrap'>
                    Feathered Anchor Sessions
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Prose>,
      320
    )
    expect(box(get(container, '#small')).width).toBeLessThan(160)
    const scroll = get(container, '#scroll') as HTMLElement
    expect(box(scroll).width).toBeLessThanOrEqual(320)
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth)
    scroll.scrollLeft = 100
    expect(scroll.scrollLeft).toBe(100)
  })

  it('keeps inline code whole in a narrow scrolling table, and fits a bare one', () => {
    const cells = (code: string) => (
      <tbody>
        <tr>
          <td>
            <code>{code}</code>
          </td>
          <td>{LONG}</td>
          <td>{LONG}</td>
        </tr>
      </tbody>
    )
    const container = renderWide(
      <Prose>
        <div className='prose-scroll'>
          <table id='scrolled'>{cells('rounded-full')}</table>
        </div>
        <table id='bare'>
          {cells('--prose-h2-size-on-the-legal-pages-at-every-breakpoint')}
        </table>
      </Prose>,
      320
    )
    expect(get(container, '#scrolled code').getClientRects()).toHaveLength(1)
    expect(box(get(container, '#bare')).right).toBeLessThanOrEqual(
      box(get(container, '[data-slot="prose"]')).right
    )
  })

  it('scrolls a wide table at a readable width on a phone, and fits a narrow one', () => {
    const container = renderWide(
      <Prose size='lg'>
        <div id='wide' className='prose-scroll'>
          <table>
            <thead>
              <tr>
                <th>Piece</th>
                <th>Must be</th>
                <th id='why'>Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  The shell layout, <code>Navigator</code>,{' '}
                  <code>Navigator.Primary</code>, and everything inside it
                </td>
                <td>Client</td>
                <td>
                  Navigator finds its parts by element reference. A server
                  component replaces those references, so items, groups, and
                  menus silently disappear.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id='narrow' className='prose-scroll'>
          <table>
            <tbody>
              <tr>
                <td>Doors</td>
                <td>Gates open at 11am</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Prose>,
      327
    )
    const wide = get(container, '#wide') as HTMLElement
    const why = get(container, '#why')
    const em = px(style(why).fontSize)
    expect(box(wide).right).toBeLessThanOrEqual(box(container).right)
    expect(box(why).width).toBeGreaterThanOrEqual(10 * em)
    expect(wide.scrollWidth).toBeGreaterThan(wide.clientWidth)

    const narrow = get(container, '#narrow') as HTMLElement
    expect(narrow.scrollWidth).toBe(narrow.clientWidth)
    expect(box(get(container, '#narrow table')).width).toBeLessThan(
      box(narrow).width
    )
  })

  it('fits a wide text table in .prose-scroll when it has 28em of room', () => {
    const container = renderWide(
      <Prose>
        <div id='roomy' className='prose-scroll'>
          <table>
            <tbody>
              <tr>
                <td>Doors</td>
                <td>{LONG}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Prose>,
      640
    )
    const roomy = get(container, '#roomy') as HTMLElement
    expect(roomy.scrollWidth).toBe(roomy.clientWidth)
    expect(box(get(container, '#roomy table')).width).toBeLessThanOrEqual(
      box(roomy).width
    )
  })

  it('restores full-width text with the class the release notes give', () => {
    const container = renderWide(
      <Prose className='[--prose-measure:none]'>
        <p id='text'>{LONG}</p>
      </Prose>
    )
    const width = box(get(container, '[data-slot="prose"]')).width
    expect(box(get(container, '#text')).width).toBe(width)
  })

  it('restores full-width tables with the recipe the release notes give', () => {
    const row = (
      <tbody>
        <tr>
          <td>Main</td>
        </tr>
      </tbody>
    )
    const container = renderWide(
      <Prose className='[&_table]:w-full'>
        <p id='text'>{LONG}</p>
        <table id='table' className='prose-bleed'>
          {row}
        </table>
        <div className='prose-scroll prose-bleed'>
          <table id='scrolled'>{row}</table>
        </div>
        <table id='capped'>{row}</table>
      </Prose>
    )
    const prose = get(container, '[data-slot="prose"]')
    const width = box(prose).width
    expect(box(get(container, '#table')).width).toBe(width)
    expect(box(get(container, '#scrolled')).width).toBe(width)
    expect(box(get(container, '#capped')).width).toBeCloseTo(
      measureOf(prose),
      0
    )
    expect(box(get(container, '#text')).width).toBeLessThan(width)
  })

  it('marks lists with a disc, then a circle when nested', () => {
    const container = renderWide(
      <Prose>
        <ul id='outer'>
          <li>
            Photo ID
            <ul id='inner'>
              <li>A licence</li>
            </ul>
          </li>
        </ul>
        <ol id='ordered'>
          <li>Step one</li>
        </ol>
      </Prose>
    )
    expect(style(get(container, '#outer')).listStyleType).toBe('disc')
    expect(style(get(container, '#inner')).listStyleType).toBe('circle')
    expect(style(get(container, '#ordered')).listStyleType).toBe('decimal')
  })

  it('takes its colours from the scheme, with no rules of its own', () => {
    const container = renderWide(
      <Prose>
        <p>
          Scan <code id='code'>data-ticket</code>
        </p>
        <h2 id='heading'>Set times</h2>
      </Prose>
    )
    const read = () => ({
      text: style(get(container, '[data-slot="prose"]')).color,
      heading: style(get(container, '#heading')).color,
      code: style(get(container, '#code')).backgroundColor
    })
    const light = read()
    document.documentElement.classList.add('dark')
    const dark = read()
    for (const key of Object.keys(light) as (keyof typeof light)[])
      expect(dark[key], key).not.toBe(light[key])
  })

  // docs/solutions/best-practices/has-invalidation-scales-with-page.md: a
  // descendant rule after a :has() anchor restyles every prose element on
  // any change under it.
  it('ships prose rules with no :has()', () => {
    const selectors: string[] = []
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) selectors.push(rule.selectorText)
        if ('cssRules' in rule) walk(rule.cssRules as CSSRuleList)
      }
    }
    for (const sheet of document.styleSheets) walk(sheet.cssRules)
    const prose = selectors.filter((selector) => /\.prose\b/.test(selector))
    expect(prose.length).toBeGreaterThan(20)
    expect(prose.filter((selector) => selector.includes(':has('))).toEqual([])
  })
})
