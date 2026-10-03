import type { ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Kbd } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { apcaLc, over, shownFill } from '../../css/contrastTestUtils'
import { setHoverCapable } from '../../css/testUtils'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import { Tabs } from '../Tabs'
import { Toggle } from '../Toggle'
import { ToggleGroup } from '../ToggleGroup'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const display = (element: Element) => getComputedStyle(element).display

describe('Kbd', () => {
  it('shows a keycap where the pointer can hover', () => {
    const { container } = render(<Kbd>/</Kbd>)
    expect(display(container.firstElementChild!)).toBe('inline-flex')
  })

  it('hides a keycap and a key group on a touch screen', () => {
    const { container } = render(
      <>
        <Kbd>/</Kbd>
        <Kbd keys={['mod', 'k']} />
        <Kbd emphasis='subtler'>Esc</Kbd>
      </>
    )
    setHoverCapable(false)
    for (const root of container.children) expect(display(root)).toBe('none')
  })

  it('keeps hints on a touch screen inside keyboard-hints always', () => {
    const { container } = render(
      <div data-keyboard-hints='always'>
        <Kbd>/</Kbd>
        <Kbd keys={['mod', 'k']} />
      </div>
    )
    setHoverCapable(false)
    for (const root of container.firstElementChild!.children)
      expect(display(root)).not.toBe('none')
  })

  it('keeps an announced key on a touch screen, where it is content', () => {
    const { container } = render(<Kbd keys={['mod', 'enter']} announce />)
    setHoverCapable(false)
    expect(display(container.firstElementChild!)).toBe('inline-flex')
  })

  it('takes a subtler key colour from the surface', () => {
    const { container } = render(
      <div className='emphasis-strong'>
        <Kbd emphasis='subtler'>K</Kbd>
      </div>
    )
    const surface = container.firstElementChild!
    expect(getComputedStyle(surface.firstElementChild!).color).toBe(
      getComputedStyle(surface).color
    )
  })

  it('gives a combined keycap the height of a single one', () => {
    const { container } = render(
      <>
        <Kbd>K</Kbd>
        <Kbd keys={['mod', 'shift', 'k']} combined />
      </>
    )
    const [single, combined] = Array.from(container.children, (cap) =>
      cap.getBoundingClientRect()
    )
    expect(combined!.height).toBe(single!.height)
    expect(combined!.width).toBeGreaterThan(single!.width)
  })

  it.each(['sm', 'md'] as const)(
    'gives every %s keycap in a group one height, glyph or word',
    (size) => {
      const { container } = render(
        <Kbd keys={['shift', 'enter', 'k', 'arrowup']} size={size} />
      )
      const heights = Array.from(
        container.querySelectorAll('[data-slot="kbd"]'),
        (cap) => cap.getBoundingClientRect().height
      )
      expect(new Set(heights).size).toBe(1)
      expect(heights[0]).toBe(size === 'sm' ? 20 : 24)
    }
  )

  it('sets combined keys in the keycap font, not the monospace kbd default', () => {
    const { container } = render(<Kbd keys={['mod', 'k']} combined />)
    const cap = container.firstElementChild!
    for (const key of cap.querySelectorAll('[data-slot="kbd-key"]'))
      expect(getComputedStyle(key).fontFamily).toBe(
        getComputedStyle(cap).fontFamily
      )
  })

  it('draws glyphs at 12px', () => {
    const { container } = render(<Kbd>Enter</Kbd>)
    const svg = container.querySelector('svg')!.getBoundingClientRect()
    expect([svg.width, svg.height]).toEqual([12, 12])
  })
})

describe('a subtle keycap', () => {
  it('takes the surrounding text colour and a fill, with no border', () => {
    const { container } = render(
      <div className='emphasis-strong'>
        <Kbd data-testid='cap'>K</Kbd>
      </div>
    )
    const surface = container.firstElementChild!
    const cap = container.querySelector('[data-testid="cap"]')!
    expect(getComputedStyle(cap).color).toBe(getComputedStyle(surface).color)
    expect(getComputedStyle(cap).borderTopWidth).toBe('0px')
    expect(shownFill(cap)).not.toEqual(shownFill(surface))
  })
})

const EMPHASES = ['normal', 'subtle', 'subtler'] as const
const SURFACES = {
  page: (kbd: ReactNode) => <div className='bg-normal'>{kbd}</div>,
  card: (kbd: ReactNode) => <div className='emphasis-normal'>{kbd}</div>,
  'raised panel': (kbd: ReactNode) => (
    <div className='emphasis-raised'>{kbd}</div>
  ),
  'sunken panel': (kbd: ReactNode) => (
    <div className='emphasis-sunken'>{kbd}</div>
  ),
  field: (kbd: ReactNode) => <div className='emphasis-field'>{kbd}</div>,
  'strong neutral': (kbd: ReactNode) => (
    <div className='emphasis-strong'>{kbd}</div>
  ),
  inverted: (kbd: ReactNode) => <div className='emphasis-inverted'>{kbd}</div>,
  overlay: (kbd: ReactNode) => <div className='emphasis-overlay'>{kbd}</div>,
  'field inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-field'>{kbd}</div>
    </div>
  ),
  'pressed strong toggle': (kbd: ReactNode) => (
    <Toggle pressed emphasis='subtle'>
      Bold {kbd}
    </Toggle>
  ),
  'selected item inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-subtle is-selected'>{kbd}</div>
    </div>
  ),
  'danger intent inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='intent-danger'>{kbd}</div>
    </div>
  ),
  'active strong tab': (kbd: ReactNode) => (
    <Tabs defaultValue='a' emphasis='strong'>
      <Tabs.List>
        <Tabs.Tab value='a'>Search {kbd}</Tabs.Tab>
        <Tabs.Tab value='b'>Filters</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
    </Tabs>
  ),
  ...Object.fromEntries(
    ['emphasis-strong'].flatMap((fill) => [
      [
        `active normal tab inside ${fill}`,
        (kbd: ReactNode) => (
          <div className={`${fill} p-2`}>
            <Tabs defaultValue='a'>
              <Tabs.List>
                <Tabs.Tab value='a'>Search {kbd}</Tabs.Tab>
                <Tabs.Tab value='b'>Filters</Tabs.Tab>
                <Tabs.Indicator />
              </Tabs.List>
            </Tabs>
          </div>
        )
      ],
      [
        `pressed subtler toggle group item inside ${fill}`,
        (kbd: ReactNode) => (
          <div className={`${fill} p-2`}>
            <ToggleGroup
              aria-label='View'
              defaultValue={['a']}
              emphasis='subtler'
            >
              <ToggleGroup.Item value='a'>List {kbd}</ToggleGroup.Item>
              <ToggleGroup.Item value='b'>Grid</ToggleGroup.Item>
            </ToggleGroup>
          </div>
        )
      ]
    ])
  ),
  'pressed toggle group item': (kbd: ReactNode) => (
    <ToggleGroup aria-label='View' defaultValue={['a']}>
      <ToggleGroup.Item value='a'>List {kbd}</ToggleGroup.Item>
      <ToggleGroup.Item value='b'>Grid</ToggleGroup.Item>
    </ToggleGroup>
  ),
  'strong inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-strong'>{kbd}</div>
    </div>
  )
}
// A tint drawn from the label sinks below Lc 60 on the coloured strong fills,
// whose labels only just clear it. The Kbd guideline puts subtler there.
const COLOURED_FILLS = {
  'strong accent button': (kbd: ReactNode) => (
    <Button emphasis='strong' intent='accent'>
      Save {kbd}
    </Button>
  ),
  'strong success button': (kbd: ReactNode) => (
    <Button emphasis='strong' intent='success'>
      Publish {kbd}
    </Button>
  ),
  ...Object.fromEntries(
    [
      'accent',
      'brand',
      'warning',
      'brand-secondary',
      'success',
      'danger',
      'info'
    ].map((intent) => [
      `strong ${intent}`,
      (kbd: ReactNode) => (
        <div className={`intent-${intent} emphasis-strong`}>{kbd}</div>
      )
    ])
  ),
  'strong inside a card inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-normal p-2'>
        <div className='emphasis-strong intent-accent'>{kbd}</div>
      </div>
    </div>
  )
}
// Paints each element's fill from just inside `from` down to `to` over `base`.
function fillsOver(
  base: ReturnType<typeof shownFill>,
  from: Element,
  to: Element
) {
  const path: Element[] = []
  for (
    let node: Element | null = to;
    node && node !== from;
    node = node.parentElement
  )
    path.unshift(node)
  return path.reduce(
    (fill, node) => over(fill, getComputedStyle(node).backgroundColor),
    base
  )
}

// The floor strongContrast holds strong-fill labels to; a hint, not body text.
const KEY_LC = 60

describe.each(['light', 'dark'] as const)('Kbd contrast in %s mode', (mode) => {
  beforeAll(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  })
  afterAll(() => document.documentElement.classList.remove('dark'))

  const rows = [
    ...Object.entries(SURFACES).map(([name, surface]) => ({
      name,
      surface,
      emphases: EMPHASES
    })),
    ...Object.entries(COLOURED_FILLS).map(([name, surface]) => ({
      name,
      surface,
      emphases: ['normal', 'subtler'] as const
    }))
  ]
  describe.each(rows)('on a $name', ({ surface, emphases }) => {
    it.each(emphases)('keeps %s keys readable', async (emphasis) => {
      const { container } = render(
        surface(
          <>
            <Kbd emphasis={emphasis} data-testid='cap'>
              K
            </Kbd>
            <Kbd
              emphasis={emphasis}
              keys={['mod', 'k']}
              combined
              data-testid='cap'
            />
          </>
        )
      )
      // Sliding indicators measure their item after a frame.
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const caps = container.querySelectorAll('[data-testid="cap"]')
      expect(caps).toHaveLength(2)
      // Tabs and toggle groups paint the pressed fill on a sibling indicator.
      const indicator = container.querySelector(
        '[data-slot="tabs-indicator"], [data-slot="toggle-group-indicator"]'
      )
      if (indicator) {
        const { display, width } = getComputedStyle(indicator)
        expect(display).not.toBe('none')
        expect(parseFloat(width)).toBeGreaterThan(0)
      }
      for (const cap of caps) {
        const background = indicator
          ? fillsOver(shownFill(indicator), indicator.parentElement!, cap)
          : shownFill(cap)
        const text = over(background, getComputedStyle(cap).color)
        expect(Math.abs(apcaLc(text, background))).toBeGreaterThanOrEqual(
          KEY_LC
        )
      }
    })
  })
})
