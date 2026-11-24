import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { ImageCrop } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

function makePhoto(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1d2a6b')
  gradient.addColorStop(1, '#f6a35b')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)))
}

describe('ImageCrop pans and pinches at 60fps on a slowed CPU', () => {
  it('pans, then pinches, a 2400 × 1600 photo for two seconds', async () => {
    const photo = await makePhoto(2400, 1600)
    const root = await mount(
      <EventPage>
        <div style={{ width: 640 }}>
          <ImageCrop src={photo} aspectRatio={2} label='Event image' />
        </div>
      </EventPage>,
      { frames: 5 }
    )
    const stage = root.querySelector<HTMLElement>(
      '[aria-roledescription="image crop"]'
    )!
    // The size chip shows once the photo has loaded and been measured.
    await expect
      .poll(() => root.querySelector('[data-slot="image-crop-size"]'))
      .not.toBeNull()
    const box = stage.getBoundingClientRect()
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const send = (type: string, pointerId: number, x: number, y: number) =>
      stage.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: 'touch',
          clientX: cx + x,
          clientY: cy + y,
          bubbles: true
        })
      )
    const frames = 120
    await expectFrameBudget(
      'ImageCrop, pan and pinch',
      await measureFrames(
        (index) => {
          const t = index / frames
          if (index === 0) send('pointerdown', 1, 0, 0)
          else if (index < frames / 2)
            send('pointermove', 1, Math.sin(t * 8) * 80, Math.cos(t * 8) * 40)
          else if (index === frames / 2) send('pointerdown', 2, 60, 0)
          else if (index < frames)
            send('pointermove', 2, 60 + (index - frames / 2) * 3, 0)
          else {
            send('pointerup', 2, 240, 0)
            send('pointerup', 1, 0, 0)
          }
        },
        { frames: frames + 1 }
      )
    )
    expect(
      root.querySelector('[data-slot="image-crop-size"]')!.textContent
    ).not.toBe('2400 × 1200px')
  })
})
