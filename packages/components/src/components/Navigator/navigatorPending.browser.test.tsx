import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { cn } from '@oztix/roadie-core/utils'

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { navigatorRootClass } from './variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

const SIZES = [
  { name: 'a wide screen with the rail expanded', width: 2000, height: 1060 },
  { name: 'a laptop with the rail collapsed', width: 1280, height: 800 },
  { name: 'a phone', width: 390, height: 844 }
]

function Frame({ className }: { className?: string }) {
  return (
    <div
      data-slot='navigator'
      data-pending='visible'
      className={cn(navigatorRootClass, className)}
    >
      <div aria-hidden data-slot='navigator-pending' />
    </div>
  )
}

const pendingSquare = () =>
  getComputedStyle(
    document.querySelector('[data-slot="navigator-pending"]')!,
    '::before'
  )

const frameElement = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator"]')!

function hold(squareRule: string) {
  const style = document.createElement('style')
  style.textContent = `
    [data-slot='navigator-pending'] { animation: none; }
    [data-slot='navigator-pending']::before { ${squareRule} }`
  document.head.append(style)
  return () => style.remove()
}

async function cornersWith(squareRule: string) {
  const release = hold(squareRule)
  try {
    const base64 = await page.screenshot({
      element: frameElement(),
      save: false
    })
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.drawImage(image, 0, 0)
    const right = canvas.width - 1
    const bottom = canvas.height - 1
    const points: [number, number][] = [
      [0, 0],
      [right, 0],
      [0, bottom],
      [right, bottom]
    ]
    return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data])
  } finally {
    release()
  }
}

// Coverage is tightest where a frame corner points at the middle of an edge.
const tightestTurns = (width: number, height: number) => {
  const turn = Math.atan2(height, width) / (2 * Math.PI)
  return [turn, 0.25 - turn]
}

describe('the pending square', () => {
  describe.each(SIZES)('on $name', ({ width, height }) => {
    it('covers every corner of the frame as it turns', async () => {
      await page.viewport(width, height)
      render(<Frame />)
      const fill = await cornersWith('content: none;')
      const turns = [0, 0.125, 0.25, ...tightestTurns(width, height)]
      for (const turn of turns) {
        const painted = await cornersWith(
          `animation: none; rotate: ${turn}turn;`
        )
        painted.forEach((pixel, corner) =>
          expect(pixel, `corner ${corner} at ${turn}turn`).not.toEqual(
            fill[corner]
          )
        )
      }
    })

    it('covers every corner when held still for reduced motion', async () => {
      await page.viewport(width, height)
      await commands.reduceMotion(true)
      try {
        render(<Frame />)
        const fill = await cornersWith('content: none;')
        const painted = await cornersWith('')
        painted.forEach((pixel, corner) =>
          expect(pixel, `corner ${corner}`).not.toEqual(fill[corner])
        )
      } finally {
        await commands.reduceMotion(false)
      }
    })

    it('draws a small square and scales it past the diagonal', async () => {
      await page.viewport(width, height)
      render(<Frame />)
      const side = parseFloat(pendingSquare().width)
      const { width: frameWidth, height: frameHeight } =
        frameElement().getBoundingClientRect()
      expect(side).toBeLessThan(1000)
      expect(parseFloat(pendingSquare().height)).toBe(side)
      expect(side * Number(pendingSquare().scale)).toBeGreaterThan(
        Math.hypot(frameWidth, frameHeight)
      )
    })
  })

  it('covers a frame taller than the viewport', async () => {
    await page.viewport(1280, 800)
    render(<Frame className='h-[2000px]' />)
    const side = parseFloat(pendingSquare().width)
    const { width, height } = frameElement().getBoundingClientRect()
    expect(height).toBe(2000)
    expect(side * Number(pendingSquare().scale)).toBeGreaterThan(
      Math.hypot(width, height)
    )
  })
})
