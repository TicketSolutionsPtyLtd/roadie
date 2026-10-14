import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Pattern, type PatternTone } from '.'
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

  it.each(['top', 'left', 'right', 'banner'] as const)(
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
