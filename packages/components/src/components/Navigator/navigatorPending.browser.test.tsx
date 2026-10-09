import type { ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { cn } from '@oztix/roadie-core/utils'

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { paneVariants } from '../Pane/variants'
import { navigatorPanesClass, navigatorRootClass } from './variants'

// Frozen for the whole file: a screenshot of an endless spin never settles.
const STILL = `
  [data-slot='navigator-pending'],
  [data-slot='navigator-pending']::before { animation: none; }`

let removeRoadie = () => {}
let removeStill = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
  removeStill = useStylesheet(STILL)
})
afterAll(async () => {
  removeStill()
  removeRoadie()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

const SIZES = [
  { name: 'a wide screen with the rail expanded', width: 2000, height: 1060 },
  { name: 'a laptop with the rail collapsed', width: 1280, height: 800 },
  { name: 'a phone', width: 390, height: 844 }
]

function Frame({
  className,
  pending = 'visible',
  children
}: {
  className?: string
  pending?: 'visible' | 'leaving'
  children?: ReactNode
}) {
  return (
    <div
      data-slot='navigator'
      data-pending={pending}
      className={cn(navigatorRootClass, className)}
    >
      <div aria-hidden data-slot='navigator-pending' />
      {children}
    </div>
  )
}

function Panes({ children }: { children?: ReactNode }) {
  return (
    <div
      data-slot='navigator-panes'
      data-level='0'
      className={navigatorPanesClass}
    >
      <div data-testid='pane' className={cn(paneVariants(), 'w-full')}>
        {children}
      </div>
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
  style.textContent = `[data-slot='navigator-pending']::before { ${squareRule} }`
  document.head.append(style)
  return () => style.remove()
}

const corners = (right: number, bottom: number): [number, number][] => [
  [0, 0],
  [right, 0],
  [0, bottom],
  [right, bottom]
]

async function pixelsWith(
  squareRule: string,
  points: (right: number, bottom: number) => [number, number][] = corners
) {
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
    return points(canvas.width - 1, canvas.height - 1).map(([x, y]) => [
      ...context.getImageData(x, y, 1, 1).data
    ])
  } finally {
    release()
  }
}

// Coverage is tightest where a frame corner points at the middle of an edge.
const tightestTurns = (width: number, height: number) => {
  const turn = Math.atan2(height, width) / (2 * Math.PI)
  return [turn, 0.25 - turn]
}

describe('the pending square', { timeout: 20_000 }, () => {
  describe.each(SIZES)('on $name', ({ width, height }) => {
    it('covers every corner of the frame as it turns', async () => {
      await page.viewport(width, height)
      render(<Frame />)
      const fill = await pixelsWith('content: none;')
      const turns = [0, 0.125, 0.25, ...tightestTurns(width, height)]
      for (const turn of turns) {
        const painted = await pixelsWith(`rotate: ${turn}turn;`)
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
        const fill = await pixelsWith('content: none;')
        const painted = await pixelsWith('')
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

const panes = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-panes"]')!

const paneRadius = (index = 0) =>
  getComputedStyle(document.querySelectorAll('[data-testid="pane"]')[index]!)
    .borderTopLeftRadius

const TURN = { turn: 1, deg: 360, rad: 2 * Math.PI, grad: 400 }
const turns = (angle: string) => {
  const [, value, unit] = /^(-?[\d.]+)(turn|deg|rad|grad)$/.exec(angle) ?? []
  return value ? Number(value) / TURN[unit as keyof typeof TURN] : 0
}

const gradientStops = (frame: Element) =>
  getComputedStyle(
    frame.querySelector('[data-slot="navigator-pending"]')!,
    '::before'
  ).backgroundImage.match(/(?:rgb|oklch|oklab|lab|lch|color)a?\([^)]*\)/g) ?? []

describe('the pending frame', { timeout: 20_000 }, () => {
  it('paints the colour under the panes it holds', async () => {
    await page.viewport(390, 844)
    render(
      <Frame>
        <Panes />
      </Frame>
    )
    const middle = (right: number, bottom: number): [number, number][] => [
      [right / 2, bottom / 2]
    ]
    const bare = await pixelsWith('content: none;', middle)
    const painted = await pixelsWith('', middle)
    expect(painted).toEqual(bare)
  })

  it('has no scrollport for the pull-back to shift', async () => {
    await page.viewport(390, 844)
    render(
      <Frame>
        <div className='h-[4000px]' />
      </Frame>
    )
    frameElement().scrollTop = 200
    expect(frameElement().scrollTop).toBe(0)
  })

  it('spins colours of its own in dark mode', async () => {
    await page.viewport(1280, 800)
    render(
      <>
        <Frame className='h-50' />
        <div className='dark'>
          <Frame className='h-50' />
        </div>
      </>
    )
    const [light = [], dark = []] = [
      ...document.querySelectorAll('[data-slot="navigator"]')
    ].map(gradientStops)
    expect(light).toHaveLength(4)
    expect(dark).toHaveLength(4)
    expect(dark[1]).not.toBe(light[1])
    expect(dark[2]).not.toBe(light[2])
  })
})

describe('the phone pull-back', () => {
  it('pulls the panes back and rounds them on a phone', async () => {
    await page.viewport(390, 844)
    render(
      <Frame>
        <Panes />
      </Frame>
    )
    expect(Number(getComputedStyle(panes()).scale)).toBe(0.96)
    expect(paneRadius()).toBe('16px')
  })

  it('holds the panes still on a wider screen', async () => {
    await page.viewport(1280, 800)
    render(
      <Frame>
        <Panes />
      </Frame>
    )
    expect(getComputedStyle(panes()).scale).toBe('none')
  })

  it('lets the panes return as the colour leaves', async () => {
    await page.viewport(390, 844)
    render(
      <Frame pending='leaving'>
        <Panes />
      </Frame>
    )
    expect(getComputedStyle(panes()).scale).toBe('none')
  })

  it('keeps the panes of a nested navigator square', async () => {
    await page.viewport(390, 844)
    render(
      <Frame>
        <Panes>
          <div data-slot='navigator'>
            <Panes />
          </div>
        </Panes>
      </Frame>
    )
    expect(paneRadius(0)).toBe('16px')
    expect(paneRadius(1)).toBe('0px')
  })
})

describe('the pending frame under reduced motion', () => {
  afterEach(() => commands.reduceMotion(false))

  it('holds the square still at an eighth of a turn', async () => {
    await page.viewport(390, 844)
    await commands.reduceMotion(true)
    removeStill()
    try {
      render(<Frame />)
      expect(pendingSquare().animationName).toBe('none')
      expect(turns(pendingSquare().rotate)).toBe(0.125)
    } finally {
      removeStill = useStylesheet(STILL)
    }
  })

  it('leaves the panes in place on a phone', async () => {
    await page.viewport(390, 844)
    await commands.reduceMotion(true)
    render(
      <Frame>
        <Panes />
      </Frame>
    )
    expect(getComputedStyle(panes()).scale).toBe('none')
  })
})
