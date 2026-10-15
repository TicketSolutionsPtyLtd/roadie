import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Pattern, type PatternCrop, type PatternTone } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

function token(name: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

function colours(svg: SVGSVGElement) {
  return {
    ground: getComputedStyle(svg.querySelector('rect')!).fill,
    line: getComputedStyle(svg.querySelector('path')!).fill
  }
}

function renderPattern(tone?: PatternTone, wrapper?: string) {
  const { container } = render(
    <div className={wrapper}>
      <Pattern tone={tone} />
    </div>
  )
  return container.querySelector('svg')!
}

describe('Pattern colour', () => {
  it.each([
    ['brand-blue', 'brand'],
    ['brand-purple', 'info'],
    ['brand-orange', 'brand-secondary']
  ] as const)(
    'draws %s as step 5 lines on a step 9 ground of the fixed %s scale',
    (tone, scale) => {
      const expected = {
        ground: token(`--color-${scale}-light-9`),
        line: token(`--color-${scale}-light-5`)
      }
      expect(colours(renderPattern(tone))).toEqual(expected)
      cleanup()

      document.documentElement.classList.add('dark')
      expect(colours(renderPattern(tone))).toEqual(expected)
    }
  )

  it('defaults to brand blue', () => {
    expect(colours(renderPattern())).toEqual(
      colours(renderPattern('brand-blue'))
    )
  })

  it.each(['constructor', 'brand-green'])(
    'falls back to brand blue for an unknown tone, %s',
    (tone) => {
      expect(colours(renderPattern(tone as PatternTone))).toEqual(
        colours(renderPattern('brand-blue'))
      )
    }
  )

  it('ignores a surrounding intent', () => {
    expect(colours(renderPattern(undefined, 'intent-danger'))).toEqual({
      ground: token('--color-brand-light-9'),
      line: token('--color-brand-light-5')
    })
  })
})

function renderSized(crop: PatternCrop, width: number, height: number) {
  const { container } = render(
    <div style={{ width, height }}>
      <Pattern crop={crop} />
    </div>
  )
  const root = container.querySelector<HTMLElement>('[data-slot=pattern]')!
  return { box: root.getBoundingClientRect(), svg: root.querySelector('svg')! }
}

// Swirl lines crossed walking from one point to another, a pixel at a time.
function walk(from: [number, number], to: [number, number]) {
  const steps = Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]))
  let lines = 0
  let onLine = false
  for (let i = 0; i <= steps; i++) {
    const hit = document.elementFromPoint(
      from[0] + ((to[0] - from[0]) * i) / steps,
      from[1] + ((to[1] - from[1]) * i) / steps
    )
    const line = hit?.tagName === 'path'
    if (line && !onLine) lines++
    onLine = line
  }
  return lines
}

const USES = [
  ['top', 'a card header', 320, 64],
  ['bottom', 'a card footer', 320, 40],
  ['top', 'a wide card header', 640, 128],
  ['top', 'a phone strip', 358, 96],
  ['banner', 'a hero', 858, 256],
  ['banner', 'a phone hero', 310, 320],
  ['banner', 'a full-width hero', 1440, 480],
  ['banner', 'a square', 300, 300],
  ['left', 'a side panel', 240, 400],
  ['right', 'a side panel', 240, 400],
  ['right', 'the default panel', 160, 256]
] as const

describe('Pattern edges', () => {
  it.each(USES)(
    'never shows the artwork’s edge as %s on %s',
    (crop, _use, width, height) => {
      const { box, svg } = renderSized(crop, width, height)
      const safe = svg.getBoundingClientRect()
      expect(safe.left).toBeLessThanOrEqual(box.left + 0.5)
      expect(safe.top).toBeLessThanOrEqual(box.top + 0.5)
      expect(safe.right).toBeGreaterThanOrEqual(box.right - 0.5)
      expect(safe.bottom).toBeGreaterThanOrEqual(box.bottom - 0.5)

      const [l, t, r, b] = [
        box.left + 1,
        box.top + 1,
        box.right - 1,
        box.bottom - 1
      ]
      for (const edge of [
        walk([l, t], [r, t]),
        walk([l, b], [r, b]),
        walk([l, t], [l, b]),
        walk([r, t], [r, b])
      ])
        expect(edge).toBeGreaterThan(0)
    }
  )
})

// Screen pixels per artwork unit. The banner behind the logo on a desktop
// docs page draws at about 0.56; every use up to that width stays within 2x
// of it, so no box shows hairlines or two giant stripes. Wider boxes cover,
// so their swirls grow with them.
describe('Pattern density', () => {
  it.each(USES.filter(([, , width]) => width <= 900))(
    'draws swirls near the banner density as %s on %s',
    (crop, _use, width, height) => {
      const { svg } = renderSized(crop, width, height)
      const scale =
        svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
      expect(scale).toBeGreaterThanOrEqual(0.29)
      expect(scale).toBeLessThanOrEqual(0.6)
    }
  )
})

describe('Pattern anchor', () => {
  it.each([
    ['top', 640, 128, 'top'],
    ['bottom', 640, 128, 'bottom'],
    ['left', 240, 400, 'left'],
    ['right', 240, 400, 'right']
  ] as const)(
    'lines the artwork up with the %s edge it sits on',
    (crop, width, height, edge) => {
      const { box, svg } = renderSized(crop, width, height)
      expect(svg.getBoundingClientRect()[edge]).toBeCloseTo(box[edge], 0)
    }
  )

  it('centres the banner', () => {
    const { box, svg } = renderSized('banner', 1280, 400)
    const safe = svg.getBoundingClientRect()
    expect(safe.top + safe.height / 2).toBeCloseTo(box.top + box.height / 2, 0)
    expect(safe.left + safe.width / 2).toBeCloseTo(box.left + box.width / 2, 0)
  })
})

describe('Pattern size', () => {
  it('fills its parent in both axes and never sizes itself', () => {
    const { box } = renderSized('banner', 320, 120)
    expect([box.width, box.height]).toEqual([320, 120])
  })

  it.each(['top', 'bottom', 'left', 'right', 'banner'] as const)(
    'takes the height of the content beside it as a %s grid panel',
    (crop) => {
      const { container } = render(
        <div className='grid grid-cols-[2fr_3fr]' style={{ width: 600 }}>
          <Pattern crop={crop} />
          <div style={{ height: 100 }} />
        </div>
      )
      const box = container
        .querySelector('[data-slot=pattern]')!
        .getBoundingClientRect()
      expect([box.width, box.height]).toEqual([240, 100])
    }
  )

  it('lets a className place it behind content', () => {
    const { container } = render(
      <div style={{ position: 'relative', width: 200, height: 100 }}>
        <Pattern className='absolute inset-0' />
      </div>
    )
    const root = container.querySelector('[data-slot=pattern]')!
    expect(getComputedStyle(root).position).toBe('absolute')
    expect(root.getBoundingClientRect().height).toBe(100)
  })
})
