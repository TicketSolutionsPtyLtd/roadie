import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichText } from '.'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  centreOf,
  fontSizeOf,
  textAlignOf,
  widths,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { longForm, statement } from './fixtures'

withBrowserPage()

describe('RichText statement', () => {
  it('centres its paragraphs under the title, at the xl text size', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<RichText {...statement} />)
    const [first] = container.querySelectorAll('.prose p')
    const title = container.querySelector('h2')!
    const probe = document.createElement('p')
    probe.className = 'text-xl'
    document.body.append(probe)

    expect(getComputedStyle(first!).textAlign).toBe('center')
    expect(centreOf(first!)).toBeCloseTo(centreOf(title), 0)
    expect(getComputedStyle(first!).fontSize).toBe(
      getComputedStyle(probe).fontSize
    )
    probe.remove()
  })

  it('runs its title the full width, with no measure', async () => {
    await atWidth(1440, 900)
    const { container } = render(<RichText {...statement} />)

    expect(getComputedStyle(container.querySelector('h2')!).maxWidth).toBe(
      'none'
    )
  })

  it.each([
    [PHONE.width, 32],
    [640, 64],
    [DESKTOP.width, 128]
  ])('breathes above and below at %ipx, as its look', async (width, space) => {
    await atWidth(width, 900)
    const { container } = render(<RichText {...statement} />)
    const content = container.querySelector('section')!.firstElementChild!

    expect(parseFloat(getComputedStyle(content).paddingTop)).toBe(space)
    expect(parseFloat(getComputedStyle(content).paddingBottom)).toBe(space)
  })
})

describe('RichText long-form', () => {
  it('holds the body to a reading width on a wide screen', async () => {
    await atWidth(1920, 1080)
    const { container } = render(<RichText {...longForm} />)
    const paragraph = container.querySelector('.prose p')!

    expect(paragraph.getBoundingClientRect().width).toBeLessThan(800)
    expect(getComputedStyle(paragraph).textAlign).toBe('start')
  })
})

describe('RichText align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('starts a statement’s text and actions when asked', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <RichText
        {...statement}
        align='start'
        actions={[{ label: 'Talk to us', href: '/contact/sales' }]}
      />
    )

    expect(textAlignOf(heading())).toBe('start')
    expect(
      screen.getByRole('link', { name: 'Talk to us' }).getBoundingClientRect()
        .left
    ).toBeCloseTo(heading().getBoundingClientRect().left, 0)
  })

  it('centres long form when asked', () => {
    render(<RichText {...longForm} align='center' />)

    expect(textAlignOf(heading())).toBe('center')
  })

  it.each([
    ['statement', statement],
    ['long-form', longForm]
  ])('sets the %s title smaller at md, and again at sm', async (_, props) => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<RichText {...props} />)
    const large = fontSizeOf(heading())

    rerender(<RichText {...props} size='md' />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<RichText {...props} size='sm' />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })

  it.each([
    ['statement', statement],
    ['long-form', longForm]
  ])(
    'sets the %s description and body smaller at md, and again at sm',
    async (_, preset) => {
      await atWidth(DESKTOP.width, DESKTOP.height)
      const props = { ...preset, description: 'A line under the title.' }
      const textSizes = () => ({
        description: fontSizeOf(screen.getByText(props.description)),
        body: fontSizeOf(document.querySelector('.prose p')!)
      })
      const { rerender } = render(<RichText {...props} />)
      const large = textSizes()

      rerender(<RichText {...props} size='md' />)
      const medium = textSizes()
      expect(medium.description).toBeLessThan(large.description)
      expect(medium.body).toBeLessThan(large.body)

      rerender(<RichText {...props} size='sm' />)
      const small = textSizes()
      expect(small.description).toBeLessThan(medium.description)
      expect(small.body).toBeLessThanOrEqual(medium.body)
    }
  )
})

describe.each([
  ['statement', statement],
  ['long-form', longForm]
])('RichText %s accessibility', (_, props) => {
  it.each(widths)(
    'has no axe violations on a $name',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(<RichText {...props} />)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
] as const

describe('RichText statement band shape', () => {
  it('rounds the band once the block is wide', async () => {
    await atWidth(1440, 900)
    const { container } = render(<RichText {...statement} emphasis='subtle' />)
    const band = container.querySelector('[data-slot=block-surface]')!

    expect(getComputedStyle(band).borderTopLeftRadius).not.toBe('0px')
  })

  it('runs square to the edges on a phone', async () => {
    await atWidth(PHONE.width, PHONE.height)
    const { container } = render(<RichText {...statement} emphasis='subtle' />)
    const band = container.querySelector('[data-slot=block-surface]')!

    expect(band.getBoundingClientRect().width).toBe(PHONE.width)
    expect(getComputedStyle(band).borderTopLeftRadius).toBe('0px')
  })

  it('keeps its breathing room on a band once wide', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<RichText {...statement} emphasis='subtle' />)
    const band = container.querySelector('[data-slot=block-surface]')!
    const illustration = band.querySelector('svg')!

    expect(
      illustration.getBoundingClientRect().top -
        band.getBoundingClientRect().top
    ).toBeGreaterThanOrEqual(128)
  })
})

describe.each(
  ([undefined, 'subtle', 'subtler', 'normal', 'raised'] as const).flatMap(
    (emphasis) => [false, true].map((inset) => [emphasis, inset] as const)
  )
)('RichText statement on a %s surface, inset %s', (emphasis, inset) => {
  it.each(MODES)(
    'keeps its body, title and mark readable under every intent in %s mode',
    async (mode) => {
      setMode(mode)
      await atWidth(DESKTOP.width, DESKTOP.height)

      for (const intent of INTENTS) {
        const { container, unmount } = render(
          <main className='bg-normal text-normal'>
            <RichText
              {...statement}
              emphasis={emphasis}
              inset={inset}
              intent={intent}
            />
          </main>
        )

        expect(
          textContrast(container.querySelector('.prose p')!),
          intent
        ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
        expect(
          textContrast(container.querySelector('h2')!),
          intent
        ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
        expect(
          textContrast(container.querySelector('mark')!),
          intent
        ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
        unmount()
      }
      setMode('light')
    }
  )

  it('has no axe violations', async () => {
    const { container } = render(
      <RichText {...statement} emphasis={emphasis} inset={inset} />
    )

    expect(await axeViolations(container)).toEqual([])
  })
})
