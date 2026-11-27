import { Suspense, act } from 'react'

import { render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import * as spot from '@oztix/roadie-illustrations/spot'
import {
  loadSpotIllustration,
  loadedSpotIllustration
} from '@oztix/roadie-illustrations/spot/load'

import { CallToAction } from '../CallToAction'
import { photo, withBrowserPage } from '../_test/browser'
import { SpotIllustrationByName } from './illustrations'

withBrowserPage()

const boxOf = (element: Element) => {
  const { x, y, width, height } = element.getBoundingClientRect()
  return { x, y, width, height }
}

// The layers' path data, which a server's style strings don't change.
const pathsOf = (svg: Element) =>
  [...svg.querySelectorAll('path')].map((path) => path.getAttribute('d'))
const reference = (Drawing: (typeof spot)['Ticket']) =>
  pathsOf(render(<Drawing outline />).container.querySelector('svg')!)

// Each test names an illustration no other test in this file loads, so it starts unloaded.
describe('a block illustration loaded on demand', () => {
  it('holds its final box while it loads, then draws the named illustration in it', async () => {
    expect(loadedSpotIllustration('Ticket')).toBeUndefined()
    const { container } = render(
      <CallToAction
        title='Explore an Oztix partnership'
        image={photo('A crowd at a gig')}
        illustration='Ticket'
      />
    )
    const reserved = container.querySelector('svg')!
    expect(reserved.querySelector('path')).toBeNull()
    const before = boxOf(reserved)
    expect(before.width).toBeGreaterThan(0)

    await expect
      .poll(() => container.querySelector('svg path'), { timeout: 5000 })
      .not.toBeNull()

    const drawn = container.querySelector('svg')!
    expect(boxOf(drawn)).toEqual(before)
    expect(pathsOf(drawn)).toEqual(reference(spot.Ticket))
  })

  it('draws at once in a box the server drew, and hydrates without a mismatch', async () => {
    await loadSpotIllustration('Heart')
    const ui = (
      <SpotIllustrationByName name='Heart' outline className='size-16' />
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(ui)
    document.body.append(container)
    onTestFinished(() => container.remove())
    const drawn = container.querySelector('svg')!
    const before = boxOf(drawn)

    const onRecoverableError = vi.fn()
    const root = await act(async () =>
      hydrateRoot(container, ui, { onRecoverableError })
    )
    onTestFinished(() => root.unmount())

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.querySelector('svg')).toBe(drawn)
    expect(boxOf(drawn)).toEqual(before)
    expect(pathsOf(drawn)).toEqual(reference(spot.Heart))
  })

  it('keeps the server’s drawing while its module loads during hydration', async () => {
    expect(loadedSpotIllustration('Star')).toBeUndefined()
    // What a server render gives: every illustration is loaded there.
    const container = document.createElement('div')
    container.innerHTML = renderToString(
      <Suspense>
        <spot.Star outline className='size-16' />
      </Suspense>
    )
    document.body.append(container)
    onTestFinished(() => container.remove())
    const drawn = container.querySelector('svg')!
    const before = boxOf(drawn)

    const onRecoverableError = vi.fn()
    const root = hydrateRoot(
      container,
      <SpotIllustrationByName name='Star' outline className='size-16' />,
      { onRecoverableError }
    )
    onTestFinished(() => root.unmount())
    expect(container.querySelector('svg')).toBe(drawn)

    await act(() => loadSpotIllustration('Star'))
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.querySelector('svg')).toBe(drawn)
    expect(boxOf(drawn)).toEqual(before)
    expect(pathsOf(drawn)).toEqual(reference(spot.Star))
  })
})
