import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Skeleton } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(cleanup)

// The computed position can be a calc(), so a probe's margin resolves it.
function offsetPx(position: string) {
  const probe = document.createElement('div')
  probe.style.marginLeft = position
  document.body.append(probe)
  const px = parseFloat(getComputedStyle(probe).marginLeft)
  probe.remove()
  return px
}

function sweep(element: HTMLElement) {
  const animation = element
    .getAnimations()
    .find(
      (running) => (running as CSSAnimation).animationName === 'shimmer-sweep'
    )!
  animation.pause()
  const period = Number(animation.effect!.getComputedTiming().duration)
  return (share: number) => {
    animation.currentTime = period * share
    return offsetPx(getComputedStyle(element).backgroundPositionX)
  }
}

describe('Skeleton shimmer', () => {
  it('sweeps its highlight left to right, the way a line reads', () => {
    const { container } = render(<Skeleton className='w-64' />)
    const at = sweep(container.firstElementChild as HTMLElement)
    expect(at(0.5)).toBeGreaterThan(at(0.25))
  })

  it('sweeps right to left in a right-to-left page', () => {
    const { container } = render(
      <div dir='rtl'>
        <Skeleton className='w-64' />
      </div>
    )
    const at = sweep(container.querySelector<HTMLElement>('.animate-shimmer')!)
    expect(at(0.5)).toBeLessThan(at(0.25))
  })
})
