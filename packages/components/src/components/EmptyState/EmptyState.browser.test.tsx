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
