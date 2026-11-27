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

  it('resizes a free-form corner in and out for two seconds', async () => {
    const photo = await makePhoto(2400, 1600)
    const root = await mount(
      <EventPage>
        <div style={{ width: 640 }}>
          <ImageCrop src={photo} label='Homepage image' />
        </div>
      </EventPage>,
      { frames: 5 }
    )
    await expect
      .poll(() => root.querySelector('[data-slot="image-crop-size"]'))
      .not.toBeNull()
    const handle = root.querySelector<HTMLElement>(
      '[aria-label="Bottom right corner"]'
    )!
    const box = handle.getBoundingClientRect()
    const send = (type: string, x: number, y: number) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: 'touch',
          clientX: box.left + box.width / 2 + x,
          clientY: box.top + box.height / 2 + y,
          bubbles: true,
          cancelable: true
        })
      )
    const frames = 120
    await expectFrameBudget(
      'ImageCrop, free-form resize',
      await measureFrames(
        (index) => {
          const t = index / frames
          // In by up to 160 × 100px and back out, past the image near the end.
          const x = -Math.sin(t * Math.PI) * 160
          const y = -Math.sin(t * Math.PI) * 100 + t * 30
          if (index === 0) send('pointerdown', 0, 0)
          else if (index < frames) send('pointermove', x, y)
          else send('pointerup', x, y)
        },
        { frames: frames + 1 }
      )
    )
    expect(
      root.querySelector('[data-slot="image-crop-size"]')!.textContent
    ).not.toBe('2400 × 1600px')
  })
})

describe('ImageCrop straightens at 60fps on a slowed CPU', () => {
  it('drags the straighten dial back and forth for two seconds', async () => {
    const photo = await makePhoto(2400, 1600)
    const root = await mount(
      <EventPage>
        <div style={{ width: 640 }}>
          <ImageCrop src={photo} aspectRatio={2} label='Event image' />
        </div>
      </EventPage>,
      { frames: 5 }
    )
    await expect
      .poll(() => root.querySelector('[data-slot="image-crop-size"]'))
      .not.toBeNull()
    const thumb = root.querySelector('[aria-label="Straighten"]')!
    const control = thumb.closest<HTMLElement>('[data-slot="slider-control"]')!
    const image = root.querySelector('img')!
    const box = control.getBoundingClientRect()
    const y = box.top + box.height / 2
    const centre = box.left + box.width / 2
    const send = (target: EventTarget, type: string, x: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
          bubbles: true
        })
      )
    const frames = 120
    const transforms = new Set<string>()
    await expectFrameBudget(
      'ImageCrop, straighten drag',
      await measureFrames(
        (index) => {
          const x = centre + Math.sin((index / frames) * 6) * box.width * 0.4
          if (index === 0) send(control, 'pointerdown', centre)
          else if (index < frames) send(control, 'pointermove', x)
          else send(control, 'pointerup', x)
          transforms.add(image.style.transform)
        },
        { frames: frames + 1 }
      )
    )
    // The drag painted the image at many angles, not just once.
    expect(transforms.size).toBeGreaterThan(frames / 2)
  })
})
