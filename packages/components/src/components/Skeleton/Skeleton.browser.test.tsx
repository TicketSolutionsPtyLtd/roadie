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

function tileWidth(element: HTMLElement) {
  return parseFloat(getComputedStyle(element).backgroundSize)
}

function marginIn(width: number, position: string) {
  const frame = document.createElement('div')
  frame.style.width = `${width}px`
  const probe = frame.appendChild(document.createElement('div'))
  probe.style.marginLeft = position
  document.body.append(frame)
  const px = parseFloat(getComputedStyle(probe).marginLeft)
  frame.remove()
  return px
}

// The position can be a calc() whose percentage is of the room the element
// leaves beside its tile, so probes 0px and 100px wide split length from share.
function offsetPx(element: HTMLElement) {
  const position = getComputedStyle(element).backgroundPositionX
  const length = marginIn(0, position)
  const percent = marginIn(100, position) - length
  const room = element.clientWidth - tileWidth(element)
  return length + (percent * room) / 100
}

function sweep(element: HTMLElement) {
  const animation = element
    .getAnimations()
    .find((running) =>
      (running as CSSAnimation).animationName.startsWith('shimmer-sweep')
    )!
  animation.pause()
  const period = Number(animation.effect!.getComputedTiming().duration)
  return (share: number) => {
    animation.currentTime = period * share
    return offsetPx(element)
  }
}

// Where the band sits on the page, whichever tile of the repeat it falls in.
function bandPhase(element: HTMLElement, share: number) {
  const tile = tileWidth(element)
  const x = element.getBoundingClientRect().left + sweep(element)(share)
  return ((x % tile) + tile) % tile
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

  it.each(['ltr', 'rtl'] as const)(
    'moves one tile per period in %s, so the loop has no seam',
    (dir) => {
      const { container } = render(
        <div dir={dir}>
          <Skeleton className='w-64' />
        </div>
      )
      const element = container.querySelector<HTMLElement>('.animate-shimmer')!
      const at = sweep(element)
      expect(Math.abs(at(0.5) - at(0))).toBeCloseTo(tileWidth(element) / 2, 0)
    }
  )

  it.each([
    ['ltr', 'left'],
    ['rtl', 'right']
  ] as const)(
    'in %s, lines up lines of different widths that share the %s edge',
    (dir, _edge) => {
      const { container } = render(
        <div dir={dir} className='grid w-160 gap-2'>
          <Skeleton />
          <Skeleton className='w-3/5' />
        </div>
      )
      const [full, short] = [
        ...container.querySelectorAll<HTMLElement>('.animate-shimmer')
      ] as [HTMLElement, HTMLElement]
      expect(bandPhase(short, 0.3)).toBeCloseTo(bandPhase(full, 0.3), 0)
    }
  )
})
