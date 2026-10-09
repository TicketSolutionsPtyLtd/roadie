import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-navigator-expanded')
})

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

const Icon = () => <svg aria-hidden className='size-6' />

const vertical = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="navigator-primary"][data-orientation="vertical"]'
  )!
const horizontal = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="navigator-primary"][data-orientation="horizontal"]'
  )!
const tile = (name: string) => within(vertical()).getByRole('link', { name })
const brand = () =>
  vertical().querySelector<HTMLElement>(
    '[data-slot="navigator-primary-brand"]'
  )!

function Rail(props: { expanded?: boolean; expandedFromDocument?: boolean }) {
  return (
    <Navigator value='/shows' {...props}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Oztix</Navigator.Brand>
        <Navigator.Item value='/shows' href='/shows' icon={<Icon />}>
          Shows
        </Navigator.Item>
        <Navigator.Item value='/orders' href='/orders' icon={<Icon />}>
          Orders
        </Navigator.Item>
        <Navigator.Item
          value='/account'
          href='/account'
          icon={<Icon />}
          placement='pinned'
        >
          Account
        </Navigator.Item>
        <Navigator.ExpandToggle />
      </Navigator.Primary>
    </Navigator>
  )
}

describe('vertical navigation', () => {
  let removeStill = () => {}
  beforeAll(async () => {
    removeStill = useStylesheet(STILL)
    await page.viewport(1280, 800)
  })
  afterAll(async () => {
    removeStill()
    await page.viewport(1920, 1080)
  })

  // primaryCapacity's fold arithmetic counts in these rem.
  it('stands each tile 3rem tall', async () => {
    render(<Rail />)
    await settle()
    expect(tile('Orders').getBoundingClientRect().height).toBe(48)
  })

  it('gives the expand toggle a 3rem row under the brand while collapsed', async () => {
    render(<Rail expanded={false} />)
    await settle()
    expect(getComputedStyle(brand()).paddingBottom).toBe('48px')
  })

  it.each([
    ['by prop', { expanded: true, expandedFromDocument: false }],
    ['from the document', { expanded: false, expandedFromDocument: true }]
  ])('widens and shows labels when expanded %s', async (_, props) => {
    if (props.expandedFromDocument) {
      document.documentElement.setAttribute('data-navigator-expanded', '')
    }
    render(<Rail {...props} />)
    await settle()
    expect(vertical().getBoundingClientRect().width).toBe(240)
    expect(getComputedStyle(tile('Orders')).fontWeight).toBe('600')
    expect(getComputedStyle(brand()).paddingBottom).toBe('0px')
    expect(
      getComputedStyle(within(tile('Orders')).getByText('Orders')).opacity
    ).toBe('1')
  })

  it('stays narrow with labels hidden while collapsed', async () => {
    render(<Rail expanded={false} />)
    await settle()
    expect(vertical().getBoundingClientRect().width).toBe(80)
    expect(
      getComputedStyle(within(tile('Orders')).getByText('Orders')).opacity
    ).toBe('0')
  })
})

describe('tiles', () => {
  beforeAll(() => page.viewport(1280, 800))
  afterAll(() => page.viewport(1920, 1080))

  it('keeps the press, colour, and focus transitions of is-interactive', async () => {
    render(
      <>
        <Rail />
        <button type='button' className='is-interactive'>
          Plain
        </button>
      </>
    )
    await settle()
    const plain = getComputedStyle(
      screen.getByRole('button', { name: 'Plain' })
    )
    const own = getComputedStyle(tile('Orders'))
    expect(own.transitionProperty).toBe(plain.transitionProperty)
    expect(own.transitionDuration).toBe(plain.transitionDuration)
  })
})

describe('active indicator', () => {
  afterAll(() => page.viewport(1920, 1080))

  it.each([
    ['vertical', 1280, vertical],
    ['horizontal', 390, horizontal]
  ] as const)(
    'slides the %s pill on translate and fades it on opacity, nothing else',
    async (_, width, surface) => {
      await page.viewport(width, 800)
      render(<Rail />)
      const indicator = () =>
        surface().querySelector<HTMLElement>(
          '[data-slot="navigator-indicator"]'
        )!
      await expect
        .poll(() => indicator().getAttribute('data-settled'))
        .toBe('true')
      expect(getComputedStyle(indicator()).transitionProperty).toBe(
        'opacity, translate'
      )
    }
  )

  it('measures every indicator against its own track', async () => {
    await page.viewport(1280, 800)
    render(<Rail />)
    await settle()
    const indicators = document.querySelectorAll<HTMLElement>(
      '[data-slot="navigator-indicator"]'
    )
    expect(indicators).toHaveLength(3)
    for (const indicator of indicators) {
      expect(getComputedStyle(indicator.parentElement!).position).toBe(
        'relative'
      )
    }
  })
})

describe('a folded menu row in More', () => {
  beforeAll(() => page.viewport(390, 844))
  afterAll(() => page.viewport(1920, 1080))

  it('draws a menu row like the link rows beside it', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Brand>Oztix</Navigator.Brand>
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((value) => (
            <Navigator.Item key={value} value={value} href={value}>
              {value}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await settle()
    await userEvent.click(
      within(horizontal()).getByRole('button', { name: 'More' })
    )
    await settle()
    const pane = document.querySelector<HTMLElement>('[data-slot="pane"][id]')!
    const menuRow = getComputedStyle(
      within(pane).getByRole('button', { name: 'Account' })
    )
    const linkRow = getComputedStyle(
      within(pane).getByRole('link', { name: '/f' })
    )
    expect(menuRow.borderTopLeftRadius).toBe(linkRow.borderTopLeftRadius)
    expect(menuRow.minHeight).toBe(linkRow.minHeight)
    expect(menuRow.paddingInlineStart).toBe(linkRow.paddingInlineStart)
  })
})

describe('the brand row', () => {
  beforeAll(() => page.viewport(1280, 800))
  afterAll(() => page.viewport(1920, 1080))

  async function renderBrandRow({
    expanded = false,
    dir = 'ltr'
  }: { expanded?: boolean; dir?: 'ltr' | 'rtl' } = {}) {
    render(
      <div dir={dir}>
        <Navigator value='/shows' expanded={expanded}>
          <Navigator.Primary aria-label='Main'>
            <Navigator.Brand />
            <Navigator.ExpandToggle />
            <Navigator.Item value='/shows' href='/shows' icon={<Icon />}>
              Shows
            </Navigator.Item>
          </Navigator.Primary>
        </Navigator>
      </div>
    )
    await settle()
    const part = (selector: string) =>
      vertical().querySelector<HTMLElement>(selector)!
    return {
      link: part('[data-slot="navigator-brand"]'),
      mark: part('[data-slot="logo-mark"]'),
      wordmark: part('[data-slot="logo-wordmark"]'),
      toggle: part('[data-slot="navigator-expand-toggle"]'),
      icon: part('[data-slot="navigator-item"] svg')
    }
  }

  const centre = (box: DOMRect) => box.left + box.width / 2

  it('shows only the logo mark, centred over the item icons, when collapsed', async () => {
    const { mark, wordmark, icon } = await renderBrandRow()

    expect(centre(mark.getBoundingClientRect())).toBeCloseTo(
      centre(icon.getBoundingClientRect()),
      0
    )
    expect(wordmark.getBoundingClientRect().width).toBe(0)
    expect(getComputedStyle(wordmark).opacity).toBe('0')
    // A folded column can animate open; display: none can't.
    expect(getComputedStyle(wordmark).display).not.toBe('none')
  })

  it('opens the wordmark beside the mark when expanded', async () => {
    const { wordmark } = await renderBrandRow({ expanded: true })

    expect(wordmark.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(getComputedStyle(wordmark).opacity).toBe('1')
  })

  it.each(['ltr', 'rtl'] as const)(
    'centres the expand toggle below the brand when collapsed, %s',
    async (dir) => {
      const { toggle } = await renderBrandRow({ dir })
      const row = brand().getBoundingClientRect()
      const box = toggle.getBoundingClientRect()

      expect(centre(box)).toBeCloseTo(centre(row), 0)
      expect(box.bottom).toBeCloseTo(row.bottom, 0)
    }
  )

  it.each(['ltr', 'rtl'] as const)(
    'puts the expand toggle 1rem in from the brand’s inline end, clear of the logo, when expanded, %s',
    async (dir) => {
      const { link, toggle } = await renderBrandRow({ expanded: true, dir })
      const row = brand().getBoundingClientRect()
      const logo = link.getBoundingClientRect()
      const box = toggle.getBoundingClientRect()

      if (dir === 'ltr') {
        expect(row.right - box.right).toBeCloseTo(16, 0)
        expect(box.left).toBeGreaterThanOrEqual(logo.right)
      } else {
        expect(box.left - row.left).toBeCloseTo(16, 0)
        expect(box.right).toBeLessThanOrEqual(logo.left)
      }
    }
  )
})
