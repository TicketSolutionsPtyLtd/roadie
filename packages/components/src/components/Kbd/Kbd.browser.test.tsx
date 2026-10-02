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

  it('gives a joined keycap the height of a single one', () => {
    const { container } = render(
      <>
        <Kbd>K</Kbd>
        <Kbd keys={['mod', 'shift', 'k']} joined />
      </>
    )
    const [single, joined] = Array.from(container.children, (cap) =>
      cap.getBoundingClientRect()
    )
    expect(joined!.height).toBe(single!.height)
    expect(joined!.width).toBeGreaterThan(single!.width)
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

  it('sets joined keys in the keycap font, not the monospace kbd default', () => {
    const { container } = render(<Kbd keys={['mod', 'k']} joined />)
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
  it('takes the surrounding text colour and draws no border', () => {
    const { container } = render(
      <div className='emphasis-strong intent-accent'>
        <Kbd data-testid='cap'>K</Kbd>
      </div>
    )
    const surface = container.firstElementChild!
    const cap = getComputedStyle(
      container.querySelector('[data-testid="cap"]')!
    )
    expect(cap.color).toBe(getComputedStyle(surface).color)
    expect(cap.borderTopWidth).toBe('0px')
    expect(cap.backgroundColor).not.toBe(getComputedStyle(surface).color)
  })
})

const EMPHASES = ['normal', 'subtle', 'subtler'] as const
const SURFACES = {
  page: (kbd: ReactNode) => <div className='bg-normal'>{kbd}</div>,
  'strong neutral': (kbd: ReactNode) => (
    <div className='emphasis-strong'>{kbd}</div>
  ),
  'strong accent button': (kbd: ReactNode) => (
    <Button emphasis='strong' intent='accent'>
      Save {kbd}
    </Button>
  ),
  'strong brand': (kbd: ReactNode) => (
    <div className='emphasis-strong intent-brand'>{kbd}</div>
  ),
  'strong warning': (kbd: ReactNode) => (
    <div className='emphasis-strong intent-warning'>{kbd}</div>
  ),
  ...Object.fromEntries(
    ['brand-secondary', 'success', 'danger', 'info'].map((intent) => [
      `strong ${intent}`,
      (kbd: ReactNode) => (
        <div className={`intent-${intent} emphasis-strong`}>{kbd}</div>
      )
    ])
  ),
  inverted: (kbd: ReactNode) => <div className='emphasis-inverted'>{kbd}</div>,
  overlay: (kbd: ReactNode) => <div className='emphasis-overlay'>{kbd}</div>,
  'field inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-field'>{kbd}</div>
    </div>
  ),
  'card inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-normal'>{kbd}</div>
    </div>
  ),
  'inverted inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-inverted'>{kbd}</div>
    </div>
  ),
  'strong inside a card inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-normal p-2'>
        <div className='emphasis-strong intent-accent'>{kbd}</div>
      </div>
    </div>
  ),
  'inverted inside a field inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-field p-2'>
        <div className='emphasis-inverted'>{kbd}</div>
      </div>
    </div>
  ),
  'pressed strong toggle': (kbd: ReactNode) => (
    <Toggle pressed emphasis='subtle'>
      Bold {kbd}
    </Toggle>
  ),
  'selected subtler toggle inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <Toggle pressed emphasis='subtler'>
        Bold {kbd}
      </Toggle>
    </div>
  ),
  'selected item inside inverted': (kbd: ReactNode) => (
    <div className='emphasis-inverted p-2'>
      <div className='emphasis-subtle is-selected'>{kbd}</div>
    </div>
  ),
  'translucent floating panel inside strong': (kbd: ReactNode) => (
    <div className='emphasis-strong p-2'>
      <div className='emphasis-floating is-translucent'>{kbd}</div>
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
    ['emphasis-inverted', 'emphasis-strong'].flatMap((fill) => [
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
// APCA's floor for bold, button-sized labels, as strongContrast checks.
const KEY_LC = 60

describe.each(['light', 'dark'] as const)('Kbd contrast in %s mode', (mode) => {
  beforeAll(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  })
  afterAll(() => document.documentElement.classList.remove('dark'))

  describe.each(Object.entries(SURFACES))('on a %s', (_, surface) => {
    it.each(EMPHASES)('keeps %s keys readable', async (emphasis) => {
      const { container } = render(
        surface(
          <>
            <Kbd emphasis={emphasis} data-testid='cap'>
              K
            </Kbd>
            <Kbd
              emphasis={emphasis}
              keys={['mod', 'k']}
              joined
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
      for (const cap of caps) {
        const background = indicator
          ? over(shownFill(indicator), getComputedStyle(cap).backgroundColor)
          : shownFill(cap)
        const text = over(background, getComputedStyle(cap).color)
        expect(Math.abs(apcaLc(text, background))).toBeGreaterThanOrEqual(
          KEY_LC
        )
      }
    })
  })
})
