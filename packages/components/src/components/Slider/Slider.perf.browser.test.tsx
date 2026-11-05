import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Slider } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Slider drags at 60fps on a slowed CPU', () => {
  it('drags the thumb across a price range', async () => {
    const root = await mount(
      <EventPage>
        <div style={{ width: 480 }}>
          <Slider aria-label='Price' defaultValue={0} max={500} />
        </div>
      </EventPage>,
      { frames: 5 }
    )
    const control = root.querySelector<HTMLElement>(
      '[data-slot="slider-control"]'
    )!
    const box = control.getBoundingClientRect()
    const y = box.top + box.height / 2
    // Base UI follows a mouse with pointer id 0 on the document, uncaptured.
    const pointer = (type: string, x: number) =>
      (type === 'pointerdown' ? control : document).dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          buttons: type === 'pointerup' ? 0 : 1,
          pointerId: 0,
          pointerType: 'mouse'
        })
      )
    const moves = 90
    await expectFrameBudget(
      'Slider, drag',
      await measureFrames(
        (index) => {
          const x = box.left + (box.width * index) / moves
          if (index === 0) pointer('pointerdown', x)
          else if (index < moves) pointer('pointermove', x)
          else pointer('pointerup', x)
        },
        { frames: moves + 1 }
      )
    )
    expect(
      root.querySelector<HTMLInputElement>('input[type="range"]')!.valueAsNumber
    ).toBeGreaterThan(400)
  })
})
