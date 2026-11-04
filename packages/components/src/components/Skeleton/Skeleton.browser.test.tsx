import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

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

// The painted frame with every animation held at one share of its period.
async function frameAt(element: HTMLElement, share: number) {
  for (const animation of element.getAnimations()) {
    animation.pause()
    const period = Number(animation.effect!.getComputedTiming().duration)
    animation.currentTime = period * share
  }
  const base64 = await page.screenshot({ element, save: false })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, canvas.width, canvas.height).data
}

const largestChannelGap = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
  a.reduce(
    (gap, channel, index) => Math.max(gap, Math.abs(channel - b[index]!)),
    0
  )

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
    'moves the band one tile per period in %s, so every band runs at one speed',
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

  it.each(['ltr', 'rtl'] as const)(
    'paints the same frame either side of the loop in %s, so it has no seam',
    async (dir) => {
      const { container } = render(
        <div dir={dir}>
          <Skeleton className='w-64' />
        </div>
      )
      const element = container.querySelector<HTMLElement>('.animate-shimmer')!
      const start = await frameAt(element, 0)
      expect(
        largestChannelGap(start, await frameAt(element, 0.5))
      ).toBeGreaterThan(8)
      expect(
        largestChannelGap(start, await frameAt(element, 0.9999))
      ).toBeLessThanOrEqual(8)
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
