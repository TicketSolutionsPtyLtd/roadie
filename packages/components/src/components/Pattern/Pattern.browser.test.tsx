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
  return container.querySelector('svg')!
}

// The swirls' outline on screen, measured from the drawn paths rather than
// the viewBox, so a viewBox that windows into the artwork can't pass.
function artworkOnScreen(svg: SVGSVGElement) {
  const ctm = svg.getScreenCTM()!
  const boxes = [...svg.querySelectorAll('path')].map((p) => p.getBBox())
  const left = Math.min(...boxes.map((b) => b.x))
  const top = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))
  return {
    left: ctm.a * left + ctm.e,
    top: ctm.d * top + ctm.f,
    right: ctm.a * right + ctm.e,
    bottom: ctm.d * bottom + ctm.f
  }
}

describe('Pattern scale', () => {
  it.each([
    ['top', 'a card header', 640, 128],
    ['bottom', 'a card footer', 640, 128],
    ['top', 'a phone strip', 358, 96],
    ['banner', 'a hero', 1280, 400],
    ['banner', 'a phone hero', 358, 320],
    ['left', 'a side panel', 240, 400],
    ['right', 'a side panel', 240, 400]
  ] as const)(
    'shows most of the artwork, not a zoomed-in slice, as %s on %s',
    (crop, _use, width, height) => {
      const art = artworkOnScreen(renderSized(crop, width, height))
      const shown =
        width >= height
          ? width / (art.right - art.left)
          : height / (art.bottom - art.top)
      expect(shown).toBeGreaterThan(0.6)
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
      const svg = renderSized(crop, width, height)
      const box = svg.getBoundingClientRect()
      expect(artworkOnScreen(svg)[edge]).toBeCloseTo(box[edge], 0)
    }
  )

  it('centres the banner', () => {
    const svg = renderSized('banner', 1280, 400)
    const box = svg.getBoundingClientRect()
    const art = artworkOnScreen(svg)
    expect((art.top + art.bottom) / 2).toBeCloseTo(box.top + box.height / 2, 0)
  })
})

describe('Pattern size', () => {
  it('fills its parent in both axes and never sizes itself', () => {
    const { container } = render(
      <div style={{ width: 320, height: 120 }}>
        <Pattern crop='banner' />
      </div>
    )
    const box = container.querySelector('svg')!.getBoundingClientRect()
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
      const box = container.querySelector('svg')!.getBoundingClientRect()
      expect([box.width, box.height]).toEqual([240, 100])
    }
  )

  it('lets a className place it behind content', () => {
    const { container } = render(
      <div style={{ position: 'relative', width: 200, height: 100 }}>
        <Pattern className='absolute inset-0' />
      </div>
    )
    expect(getComputedStyle(container.querySelector('svg')!).position).toBe(
      'absolute'
    )
  })
})
