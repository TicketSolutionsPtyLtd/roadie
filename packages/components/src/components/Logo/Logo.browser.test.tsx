import type { ReactElement } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'

import { Logo, type LogoProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const COLLAPSE =
  '.collapsed :is([data-slot=logo-wordmark], [data-slot=logo-product]) { grid-template-columns: 0fr }'

// The mark is 1em square, so it measures the em the gap is set in.
function renderLogo(logo: ReactElement, collapsed = false) {
  render(<div className={collapsed ? 'collapsed' : undefined}>{logo}</div>)
  const root = screen.getByRole('img')
  const box = (slot: string) =>
    root.querySelector(`[data-slot=${slot}]`)!.getBoundingClientRect()
  return { root: root.getBoundingClientRect(), box }
}

describe.each([
  ['logo-wordmark', <Logo key='normal' />, 'svg'],
  ['logo-product', <Logo key='product' product='Studio' />, 'span span']
] as const)('the %s part', (slot, logo, content) => {
  it('sits 1em/6 after the mark', () => {
    const { box } = renderLogo(logo)
    const inner = document
      .querySelector(`[data-slot=${slot}] ${content}`)!
      .getBoundingClientRect()

    expect(box(slot).left).toBeCloseTo(box('logo-mark').right, 0)
    const em = box('logo-mark').width
    expect(inner.left - box('logo-mark').right).toBeCloseTo(em / 6, 1)
  })

  it('folds away with its gap when a parent collapses its column, leaving the mark', () => {
    onTestFinished(useStylesheet(COLLAPSE))
    const { root, box } = renderLogo(logo, true)

    expect(box(slot).width).toBe(0)
    expect(root.width).toBeCloseTo(box('logo-mark').width, 1)
    const part = document.querySelector(`[data-slot=${slot}]`)!
    expect(getComputedStyle(part).overflowX).not.toBe('visible')
  })
})

describe('the tagline', () => {
  it('sits 1em/3 either side of a full-height divider, centred on the mark', () => {
    const { root, box } = renderLogo(<Logo variant='tagline' />)
    const divider = box('logo-divider')
    const tagline = document
      .querySelector('[data-slot=logo-tagline] svg')!
      .getBoundingClientRect()
    const em = box('logo-mark').width

    expect(root.height).toBeCloseTo(em, 1)
    expect(divider.left - box('logo-wordmark').right).toBeCloseTo(em / 3, 1)
    expect(divider.height).toBeCloseTo(em, 1)
    expect(tagline.left - divider.right).toBeCloseTo(em / 3, 1)
    expect(tagline.height).toBeCloseTo((em * 38) / 48, 1)
    expect(tagline.top - root.top).toBeCloseTo((em * 5) / 48, 1)
  })

  it('folds away when a parent collapses its column', () => {
    onTestFinished(
      useStylesheet(
        '.collapsed [data-slot=logo-tagline] { grid-template-columns: 0fr }'
      )
    )
    const { box } = renderLogo(<Logo variant='tagline' />, true)
    expect(box('logo-tagline').width).toBe(0)
  })
})

describe('the vertical lockup', () => {
  it('centres the mark over a wordmark and tagline 1.5em wide, 1em/12 apart', () => {
    const { root, box } = renderLogo(
      <Logo direction='vertical' variant='tagline' />
    )
    const mark = box('logo-mark')
    const wordmark = box('logo-wordmark')
    const tagline = box('logo-tagline')
    const em = mark.width

    expect(root.width).toBeCloseTo(em * 1.5, 1)
    expect(wordmark.width).toBeCloseTo(em * 1.5, 1)
    expect(tagline.width).toBeCloseTo(em * 1.5, 1)
    expect(mark.left - root.left).toBeCloseTo(em / 4, 1)
    expect(wordmark.top - mark.bottom).toBeCloseTo(em / 12, 1)
    expect(tagline.top - wordmark.bottom).toBeCloseTo(em / 12, 1)
    expect(root.height).toBeCloseTo(tagline.bottom - mark.top, 1)
  })

  it('keeps a product lockup on one row for an untyped caller', () => {
    const props = { direction: 'vertical', product: 'Studio' } as const
    const { box } = renderLogo(<Logo {...(props as unknown as LogoProps)} />)
    expect(box('logo-product').top).toBeCloseTo(box('logo-mark').top, 0)
    expect(box('logo-product').left).toBeCloseTo(box('logo-mark').right, 0)
  })
})

describe('tone', () => {
  function colours(logo: ReactElement, wrapper?: string) {
    render(<div className={wrapper}>{logo}</div>)
    const root = screen.getByRole('img')
    const tagline = root.querySelector('[data-slot=logo-tagline]')
    const divider = root.querySelector('[data-slot=logo-divider]')
    const result = {
      logo: getComputedStyle(root).color,
      tagline: tagline && getComputedStyle(tagline).color,
      divider: divider && getComputedStyle(divider).borderLeftColor
    }
    cleanup()
    return result
  }

  function token(name: string, wrapper?: string) {
    render(
      <div className={wrapper}>
        <span data-testid='probe' style={{ color: `var(${name})` }} />
      </div>
    )
    const value = getComputedStyle(screen.getByTestId('probe')).color
    cleanup()
    return value
  }

  it.each(['brand', 'dark', 'light'] as const)(
    'keeps the %s logo colour in dark mode and inside an intent',
    (tone) => {
      const light = colours(<Logo tone={tone} />)
      expect(colours(<Logo tone={tone} />, 'dark').logo).toBe(light.logo)
      expect(colours(<Logo tone={tone} />, 'intent-danger').logo).toBe(
        light.logo
      )
    }
  )

  it.each([
    ['brand', '--color-brand-light-9'],
    ['dark', '--color-neutral-light-13'],
    ['light', '--color-neutral-light-0']
  ] as const)('draws the %s logo in the fixed %s', (tone, name) => {
    expect(colours(<Logo tone={tone} />, 'dark').logo).toBe(token(name))
  })

  it('defaults to the brand tone', () => {
    expect(colours(<Logo />).logo).toBe(token('--color-brand-light-9'))
  })

  it('fixes the dark and light taglines and dividers in dark mode', () => {
    const dark = colours(<Logo tone='dark' variant='tagline' />, 'dark')
    expect(dark.tagline).toBe(token('--color-neutral-light-12'))
    expect(dark.divider).toBe(token('--color-neutral-light-5'))

    const light = colours(<Logo tone='light' variant='tagline' />, 'dark')
    expect(light.tagline).toBe(token('--color-neutral-light-0'))
    expect(light.divider).toBe(token('--color-neutral-light-0'))
  })

  it.each(['brand', 'dark', 'light', 'neutral'] as const)(
    'colours the vertical %s tagline like the horizontal one',
    (tone) => {
      const vertical = (
        <Logo tone={tone} direction='vertical' variant='tagline' />
      )
      const horizontal = <Logo tone={tone} variant='tagline' />

      expect(colours(vertical).tagline).toBe(colours(horizontal).tagline)
      expect(colours(vertical, 'dark').tagline).toBe(
        colours(horizontal, 'dark').tagline
      )
    }
  )

  it('lets the brand tagline follow the theme but not a surrounding intent', () => {
    const light = colours(<Logo variant='tagline' />)
    const dark = colours(<Logo variant='tagline' />, 'dark')

    expect(light.tagline).toBe(token('--color-neutral-12'))
    expect(light.divider).toBe(token('--color-neutral-7'))
    expect(dark.tagline).not.toBe(light.tagline)
    expect(dark.divider).not.toBe(light.divider)
    expect(colours(<Logo variant='tagline' />, 'intent-danger')).toEqual(light)
  })

  it('draws the neutral logo dark in light mode and light in dark mode', () => {
    const light = colours(<Logo tone='neutral' variant='tagline' />)
    const dark = colours(<Logo tone='neutral' variant='tagline' />, 'dark')

    expect(light.logo).toBe(token('--color-neutral-13'))
    expect(light.tagline).toBe(token('--color-neutral-12'))
    expect(light.divider).toBe(token('--color-neutral-7'))
    expect(dark.logo).toBe(token('--color-neutral-13', 'dark'))
    expect(dark.tagline).toBe(token('--color-neutral-12', 'dark'))
    expect(dark.divider).toBe(token('--color-neutral-8', 'dark'))
    expect(dark.logo).not.toBe(light.logo)
  })

  it('keeps the neutral logo untinted inside an intent', () => {
    const plain = colours(<Logo tone='neutral' variant='tagline' />)
    expect(
      colours(<Logo tone='neutral' variant='tagline' />, 'intent-danger')
    ).toEqual(plain)
    expect(
      colours(<Logo tone='neutral' variant='tagline' />, 'dark intent-danger')
    ).toEqual(colours(<Logo tone='neutral' variant='tagline' />, 'dark'))
  })
})
