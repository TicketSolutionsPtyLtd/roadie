import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Slider } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Field } from '../Field'
import { NumberField } from '../NumberField'
import { useStylesheet } from '../Pane/testUtils'
import { Select } from '../Select'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!
const rect = (el: Element) => el.getBoundingClientRect()
const gapUnderLabel = (control: Element) =>
  rect(control).top - rect(slot('field-label')).bottom

const sizes = ['sm', 'md', 'lg'] as const
const thumbPx = { sm: 16, md: 20, lg: 24 }

for (const width of [1280, 390]) {
  describe(`Slider at ${width}px`, () => {
    beforeAll(() => page.viewport(width, 800))

    it('sits as close under Field.Label as Input, Select and NumberField', () => {
      const { unmount: u1 } = render(
        <Field>
          <Field.Label>Email</Field.Label>
          <Field.Input />
        </Field>
      )
      const inputGap = gapUnderLabel(document.querySelector('input')!)
      u1()

      const { unmount: u2 } = render(
        <Field>
          <Field.Label>Industry</Field.Label>
          <Select>
            <Select.Trigger>
              <Select.Value placeholder='Select' />
            </Select.Trigger>
          </Select>
        </Field>
      )
      const selectGap = gapUnderLabel(document.querySelector('button')!)
      u2()

      const { unmount: u3 } = render(
        <Field>
          <Field.Label>Tickets</Field.Label>
          <NumberField defaultValue={1} />
        </Field>
      )
      const numberGap = gapUnderLabel(slot('number-field-group'))
      u3()

      const gaps: number[] = []
      for (const size of sizes) {
        const { unmount } = render(
          <Field>
            <Field.Label>Radius</Field.Label>
            <Slider size={size} defaultValue={40} />
          </Field>
        )
        const thumbGap = gapUnderLabel(slot('slider-thumb'))
        gaps.push(thumbGap)
        unmount()
      }
      for (const gap of gaps)
        expect(Math.abs(gap - inputGap)).toBeLessThanOrEqual(2)
      expect(Math.abs(selectGap - inputGap)).toBeLessThanOrEqual(2)
      expect(Math.abs(numberGap - inputGap)).toBeLessThanOrEqual(2)
    })

    it('puts the value beside the track when Field.Label names it', () => {
      render(
        <Field>
          <Field.Label>Search radius</Field.Label>
          <Slider defaultValue={25}>
            <Slider.Value />
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb />
              </Slider.Track>
            </Slider.Control>
          </Slider>
        </Field>
      )
      expect(gapUnderLabel(slot('slider-thumb'))).toBeCloseTo(6, 0)
      const value = rect(slot('slider-value'))
      const track = rect(slot('slider-track'))
      expect(value.left).toBeGreaterThan(track.right)
      expect(value.top + value.height / 2).toBeCloseTo(
        track.top + track.height / 2,
        0
      )
    })

    for (const size of sizes) {
      it(`keeps a 44px press band and thumbs inside the box at ${size}`, () => {
        render(
          <div style={{ width: 300, padding: 40 }}>
            <Slider aria-label='Price' size={size} defaultValue={[0, 100]} />
          </div>
        )
        const control = slot('slider-control')
        const track = rect(slot('slider-track'))
        const box = rect(slot('slider'))
        const centreY = track.top + track.height / 2
        for (const dy of [-20, 20]) {
          const hit = document.elementFromPoint(
            track.left + track.width / 2,
            centreY + dy
          )
          expect(control.contains(hit)).toBe(true)
        }
        expect(rect(control).height).toBeCloseTo(thumbPx[size], 0)
        const [first, last] = [
          ...document.querySelectorAll('[data-slot="slider-thumb"]')
        ]
        expect(first && last).toBeTruthy()
        expect(rect(first!).left).toBeGreaterThanOrEqual(box.left - 0.5)
        expect(rect(last!).right).toBeLessThanOrEqual(box.right + 0.5)
      })
    }

    it('reaches min and max when pressed at the ends of the control', async () => {
      render(
        <div style={{ width: 300, padding: 40 }}>
          <Slider aria-label='Price' defaultValue={50} />
        </div>
      )
      const control = slot('slider-control')
      const { width: w, height: h } = rect(control)
      const thumb = document.querySelector('input')!
      await userEvent.click(control, { position: { x: 1, y: h / 2 } })
      expect(thumb).toHaveAttribute('aria-valuenow', '0')
      await userEvent.click(control, { position: { x: w - 1, y: h / 2 } })
      expect(thumb).toHaveAttribute('aria-valuenow', '100')
    })

    it('keeps a 44px press band across a vertical slider', () => {
      render(
        <div style={{ padding: 40 }}>
          <Slider aria-label='Level' direction='vertical' defaultValue={50} />
        </div>
      )
      const control = slot('slider-control')
      const track = rect(slot('slider-track'))
      const centreX = track.left + track.width / 2
      for (const dx of [-20, 20]) {
        const hit = document.elementFromPoint(
          centreX + dx,
          track.top + track.height / 2
        )
        expect(control.contains(hit)).toBe(true)
      }
      expect(rect(control).width).toBeCloseTo(20, 0)
    })

    it('spaces the label row above the track like Field', () => {
      render(<Slider label='Price' defaultValue={40} />)
      const gap =
        rect(slot('slider-thumb')).top - rect(slot('slider-label')).bottom
      expect(gap).toBeCloseTo(6, 0)
    })
  })
}
