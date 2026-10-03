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

  // A Button sizes svgs that don't name a size, at higher specificity than
  // Kbd's descendant rule.
  it.each(['sm', 'md'] as const)(
    'draws glyphs at 12px inside a %s button',
    (size) => {
      const { container } = render(
        <Button size={size}>
          Search <Kbd keys={['mod', 'k']} size='sm' />
          <Kbd keys={['mod', 'k']} size='sm' combined />
        </Button>
      )
      const glyphs = container.querySelectorAll('kbd svg')
      expect(glyphs.length).toBeGreaterThan(0)
      for (const svg of glyphs) {
        const { width, height } = svg.getBoundingClientRect()
        expect([width, height]).toEqual([12, 12])
      }
    }
  )

  it('draws a custom icon at 12px inside a button', () => {
    const { container } = render(
      <Button>
        Bold{' '}
        <Kbd size='sm'>
          <svg viewBox='0 0 1 1' />
        </Kbd>
      </Button>
    )
    const { width, height } = container
      .querySelector('kbd svg')!
      .getBoundingClientRect()
    expect([width, height]).toEqual([12, 12])
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
  'card inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-normal'>{kbd}</div>
    </div>
  ),
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
    ['emphasis-strong', 'emphasis-inverted'].flatMap((fill) => [
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
// A subtle keycap in muted text measures about Lc 58 in dark mode; it is held
// to Lc 55 there until the floor for it is decided.
const MUTED_TEXT_LC = 55
const MUTED_TEXT = {
  'muted text': (kbd: ReactNode) => (
    <p className='bg-normal text-subtle'>{kbd}</p>
  )
}

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

// Matches strongContrast's floor for strong-fill labels.
const KEY_LC = 60
// These fills are tuned so their label only just clears Lc 60, and a subtle
// keycap's tint pulls the fill toward it (lowest measured 52.6). The user
// accepted Lc 50 here: the keys are aria-hidden and repeat the control's own
// aria-keyshortcuts.
const TUNED_FILL_LC = 50
const TUNED_FILLS = new Set([
  'strong success button',
  'strong success',
  'strong warning',
  'strong danger',
  'strong brand-secondary'
])

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
      emphases: EMPHASES
    })),
    ...Object.entries(MUTED_TEXT).map(([name, surface]) => ({
      name,
      surface,
      emphases: EMPHASES
    }))
  ]
  describe.each(rows)('on a $name', ({ name, surface, emphases }) => {
    it.each(emphases)('keeps %s keys readable', async (emphasis) => {
      const floor =
        emphasis !== 'subtle'
          ? KEY_LC
          : TUNED_FILLS.has(name)
            ? TUNED_FILL_LC
            : name in MUTED_TEXT
              ? MUTED_TEXT_LC
              : KEY_LC
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
            <Kbd
              emphasis={emphasis}
              keys={['shift', 'k']}
              data-testid='group'
            />
          </>
        )
      )
      // Sliding indicators measure their item after a frame.
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const caps = [
        ...container.querySelectorAll('[data-testid="cap"]'),
        ...container.querySelectorAll(
          '[data-testid="group"] > [data-slot="kbd"]'
        )
      ]
      expect(caps).toHaveLength(4)
      // Tabs and toggle groups paint the pressed fill on a sibling indicator.
      const indicator = container.querySelector(
        '[data-slot="tabs-indicator"], [data-slot="toggle-group-indicator"]'
      )
      if (indicator) {
        const { display, opacity } = getComputedStyle(indicator)
        expect(display).not.toBe('none')
        expect(opacity).not.toBe('0')
        const box = indicator.getBoundingClientRect()
        for (const cap of caps) {
          expect(indicator.parentElement!.contains(cap)).toBe(true)
          const { x, y, width, height } = cap.getBoundingClientRect()
          const [cx, cy] = [x + width / 2, y + height / 2]
          expect(cx > box.left && cx < box.right).toBe(true)
          expect(cy > box.top && cy < box.bottom).toBe(true)
        }
      }
      for (const cap of caps) {
        const background = indicator
          ? fillsOver(shownFill(indicator), indicator.parentElement!, cap)
          : shownFill(cap)
        const text = over(background, getComputedStyle(cap).color)
        expect(Math.abs(apcaLc(text, background))).toBeGreaterThanOrEqual(floor)
      }
    })
  })
})
