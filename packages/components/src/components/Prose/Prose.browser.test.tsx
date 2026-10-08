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

  it('uses UI heading sizes at sm and prose heading sizes at md', () => {
    const container = renderWide(
      <>
        <Prose size='sm'>
          <h1 id='sm'>Title</h1>
        </Prose>
        <Prose>
          <h1 id='md'>Title</h1>
        </Prose>
      </>
    )
    expect(style(get(container, '#sm')).fontWeight).toBe('700')
    expect(style(get(container, '#md')).fontWeight).toBe('900')
    expect(px(style(get(container, '#sm')).fontSize)).toBeLessThan(
      px(style(get(container, '#md')).fontSize)
    )
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

  it('restores full-width text and tables with the classes the release notes give', () => {
    const container = renderWide(
      <Prose className='[--prose-measure:none] [&_table]:w-full'>
        <p id='text'>{LONG}</p>
        <table id='table'>
          <tbody>
            <tr>
              <td>Main</td>
            </tr>
          </tbody>
        </table>
      </Prose>
    )
    const width = box(get(container, '[data-slot="prose"]')).width
    expect(box(get(container, '#text')).width).toBe(width)
    expect(box(get(container, '#table')).width).toBe(width)
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
