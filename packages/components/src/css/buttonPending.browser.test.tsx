import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await commands.reduceMotion(false)
})

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
    // Transparent ink, whatever the channels it faded from.
    await expect
      .poll(() => getComputedStyle(link).webkitTextFillColor, { timeout: 2000 })
      .toMatch(/, 0\)$/)
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
