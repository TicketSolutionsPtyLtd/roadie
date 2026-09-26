import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Progress } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const LONG_LABEL =
  'Uploading the headline poster for Harbourside Lights at the Riverside Hall'

const CASES = [
  { width: 460, label: 'Uploaded', value: 100 },
  { width: 390, label: 'Uploaded', value: 100 },
  { width: 160, label: LONG_LABEL, value: 100 },
  {
    width: 160,
    label: LONG_LABEL,
    value: 400,
    max: 400,
    valueText: '400 of 400'
  },
  { width: 96, label: LONG_LABEL, value: 100 }
]

const rect = (root: HTMLElement, slot: string) =>
  root.querySelector(`[data-slot=${slot}]`)!.getBoundingClientRect()

describe('Progress keeps the value inside the row', () => {
  for (const { width, ...props } of CASES)
    it(`at ${width}px with ${props.valueText ?? `${props.value}%`}`, () => {
      const { container } = render(
        <div style={{ width }}>
          <Progress {...props} />
        </div>
      )
      const root = rect(container, 'progress')
      const track = rect(container, 'progress-track')
      const label = rect(container, 'progress-label')
      const value = rect(container, 'progress-value')

      expect(Math.abs(value.right - track.right)).toBeLessThanOrEqual(1)
      expect(track.right).toBeLessThanOrEqual(root.right + 1)
      expect(label.right).toBeLessThanOrEqual(value.left)
      expect(root.width).toBeLessThanOrEqual(width + 1)
      const progress = container.querySelector<HTMLElement>(
        '[data-slot=progress]'
      )!
      expect(progress.scrollWidth).toBeLessThanOrEqual(progress.clientWidth)
    })

  it('keeps the value in when a composed label cannot shrink', () => {
    const { container } = render(
      <div style={{ width: 200 }}>
        <Progress value={100}>
          <span className='whitespace-nowrap'>{LONG_LABEL}</span>
          <Progress.Value />
          <Progress.Track>
            <Progress.Indicator />
          </Progress.Track>
        </Progress>
      </div>
    )
    const root = rect(container, 'progress')
    const value = rect(container, 'progress-value')
    const track = rect(container, 'progress-track')
    expect(Math.abs(value.right - track.right)).toBeLessThanOrEqual(1)
    expect(value.right).toBeLessThanOrEqual(root.right + 1)
  })

  it('holds the value width between 99% and 100%', () => {
    const { container, rerender } = render(
      <div style={{ width: 390 }}>
        <Progress value={99} label='Uploading' />
      </div>
    )
    const before = rect(container, 'progress-value').right
    rerender(
      <div style={{ width: 390 }}>
        <Progress value={100} label='Uploaded' />
      </div>
    )
    expect(rect(container, 'progress-value').right).toBeCloseTo(before, 0)
  })
})
