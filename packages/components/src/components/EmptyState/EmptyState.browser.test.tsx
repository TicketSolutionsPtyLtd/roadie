import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { EmptyState, type EmptyStateSize } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

function renderEmpty(size?: EmptyStateSize) {
  render(
    <EmptyState size={size}>
      <EmptyState.Title>No events yet</EmptyState.Title>
    </EmptyState>
  )
  const title = screen.getByRole('heading', { name: 'No events yet' })
  return {
    padding: parseFloat(getComputedStyle(title.parentElement!).paddingTop),
    titleSize: parseFloat(getComputedStyle(title).fontSize)
  }
}

describe.each([
  ['a phone', 390, 64],
  ['a desktop', 1280, 96]
])('EmptyState on %s', (_, width, largePadding) => {
  beforeAll(() => page.viewport(width, 800))

  it.each([
    ['sm', 32],
    ['md', 48],
    ['lg', largePadding]
  ] as const)('pads a %s empty state by %ipx', (size, padding) => {
    expect(renderEmpty(size).padding).toBe(padding)
  })

  it('pads by 48px by default', () => {
    expect(renderEmpty().padding).toBe(48)
  })
})

/** The font size and weight a bare element takes from `className`. */
function textStyleOf(className: string) {
  const probe = document.createElement('p')
  probe.className = className
  document.body.append(probe)
  const { fontSize, fontWeight } = getComputedStyle(probe)
  probe.remove()
  return { fontSize, fontWeight }
}
const fontSizeOf = (className: string) => textStyleOf(className).fontSize

// The parts read the size from the nearest root's data-size, with no context.
describe.each([
  ['sm', 'text-display-ui-5', 'text-sm', '-12px', 64],
  ['md', 'text-display-ui-3', 'text-base', '-16px', 160],
  ['lg', 'text-display-prose-2', 'text-lg', '-24px', 448]
] as const)(
  'a %s EmptyState',
  (size, titleClass, bodyClass, pullUp, mediaWidth) => {
    beforeAll(() => page.viewport(1280, 800))

    function renderParts() {
      render(
        <EmptyState size={size}>
          <EmptyState.Illustration data-testid='media'>
            <svg viewBox='0 0 10 10' />
          </EmptyState.Illustration>
          <EmptyState.Title>No events yet</EmptyState.Title>
          <EmptyState.Description>Check back soon.</EmptyState.Description>
        </EmptyState>
      )
      return {
        title: getComputedStyle(screen.getByRole('heading')),
        body: getComputedStyle(screen.getByText('Check back soon.')),
        media: screen.getByTestId('media').querySelector('svg')!
      }
    }

    it(`sets the title in ${titleClass}`, () => {
      const { title } = renderParts()
      const { fontSize, fontWeight } = textStyleOf(titleClass)
      expect([title.fontSize, title.fontWeight]).toEqual([fontSize, fontWeight])
    })

    it(`sets the description in ${bodyClass}, pulled ${pullUp} toward the title`, () => {
      const { body } = renderParts()
      expect(body.fontSize).toBe(fontSizeOf(bodyClass))
      expect(body.marginTop).toBe(pullUp)
    })

    it(`draws the illustration ${mediaWidth}px wide`, () => {
      const { media } = renderParts()
      expect(media.getBoundingClientRect().width).toBe(mediaWidth)
    })
  }
)

// A tall photo caps at sm and md, and runs the full width uncapped at lg.
describe.each([
  ['sm', 96],
  ['md', 160],
  ['lg', 448 * 4]
] as const)('a %s EmptyState with a tall photo', (size, height) => {
  beforeAll(() => page.viewport(1280, 800))

  it(`draws it ${height}px tall`, async () => {
    render(
      <EmptyState size={size}>
        <EmptyState.Illustration>
          <img
            alt='Tall'
            src={`data:image/svg+xml,${encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='400'/>"
            )}`}
          />
        </EmptyState.Illustration>
      </EmptyState>
    )
    const img = screen.getByAltText<HTMLImageElement>('Tall')
    await img.decode()
    expect(img.getBoundingClientRect().height).toBe(height)
  })
})

// A nested root scopes its parts, whichever size its ancestor root has.
describe.each([
  ['sm', 'md', 'text-display-ui-3'],
  ['lg', 'sm', 'text-display-ui-5'],
  ['md', 'lg', 'text-display-prose-2'],
  ['sm', 'lg', 'text-display-prose-2'],
  ['lg', 'md', 'text-display-ui-3']
] as const)(
  'an EmptyState of %s around one of %s',
  (outer, inner, titleClass) => {
    it(`sets the inner title in ${titleClass}`, () => {
      render(
        <EmptyState size={outer}>
          <EmptyState size={inner}>
            <EmptyState.Title>Inner</EmptyState.Title>
          </EmptyState>
        </EmptyState>
      )
      expect(
        getComputedStyle(screen.getByRole('heading', { name: 'Inner' }))
          .fontSize
      ).toBe(fontSizeOf(titleClass))
    })
  }
)

describe('EmptyState title', () => {
  it('grows with the empty state', () => {
    const sizes = (['sm', 'md', 'lg'] as const).map((size) => {
      const { titleSize } = renderEmpty(size)
      cleanup()
      return titleSize
    })
    expect(sizes[1]).toBeGreaterThan(sizes[0]!)
    expect(sizes[2]).toBeGreaterThan(sizes[1]!)
  })
})
