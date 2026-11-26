import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../vitest.browser.css?inline'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await commands.reduceMotion(false)
})

// Zero alpha as each engine writes it: rgba(…, 0), color(… / 0), oklab(… / 0).
const TRANSPARENT = /^rgba\(.+, 0\)$|\/ 0\)$/

describe('btn with aria-busy', () => {
  it('draws the pending look on plain markup', async () => {
    render(
      <a
        href='/checkout'
        className='btn btn-md emphasis-strong'
        aria-busy='true'
      >
        Checkout
      </a>
    )
    const link = screen.getByRole('link')
    await expect
      .poll(() => getComputedStyle(link, '::before').opacity, { timeout: 2000 })
      .toBe('1')
    await expect
      .poll(() => getComputedStyle(link).webkitTextFillColor, { timeout: 2000 })
      .toMatch(TRANSPARENT)
  })

  it('holds the ring still for someone who reduces motion', async () => {
    await commands.reduceMotion(true)
    render(
      <button type='button' className='btn btn-md' aria-busy='true'>
        Save
      </button>
    )
    const ring = getComputedStyle(screen.getByRole('button'), '::before')
    expect(ring.content).not.toBe('none')
    expect(ring.animationIterationCount.split(', ')).not.toContain('infinite')
    // No wait either: the ring is there at once.
    await expect.poll(() => ring.opacity, { timeout: 500 }).toBe('1')
  })

  it('draws nothing when aria-busy is false', () => {
    render(
      <button type='button' className='btn btn-md' aria-busy='false'>
        Save
      </button>
    )
    expect(
      getComputedStyle(screen.getByRole('button'), '::before').content
    ).toBe('none')
  })
})
