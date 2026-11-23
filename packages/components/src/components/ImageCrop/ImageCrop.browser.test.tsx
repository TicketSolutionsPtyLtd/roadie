import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import type { ImageCropValue } from '@oztix/roadie-core/image'

import { ImageCrop, type ImageCropProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

function makePhoto(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = '#3a6'
  context.fillRect(0, 0, width, height)
  return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)))
}

const nextFrames = async () => {
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
}

let removeStylesheet = () => {}
let photo: Blob
let square: Blob
let tiny: Blob
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  ;[photo, square, tiny] = await Promise.all([
    makePhoto(2400, 1600),
    makePhoto(1600, 1600),
    makePhoto(120, 60)
  ])
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// A 640px stage is 480px tall, so a 2:1 frame is 544 × 272 inside its 48px inset.
async function renderCrop(props: Partial<ImageCropProps> = {}) {
  const onValueChange = vi.fn<(value: ImageCropValue) => void>()
  const crop = (more: Partial<ImageCropProps>) => (
    <div style={{ width: 640 }}>
      <ImageCrop
        src={photo}
        aspectRatio={2}
        label='Event image'
        onValueChange={onValueChange}
        {...props}
        {...more}
      />
    </div>
  )
  const { rerender } = render(crop({}))
  await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))
  const stage = screen.getByRole('group', { name: 'Event image' })
  const last = () => onValueChange.mock.lastCall![0]
  const update = (more: Partial<ImageCropProps>) => rerender(crop(more))
  return { stage, onValueChange, last, update }
}

const rect = (element: Element) => element.getBoundingClientRect()
const frameOf = (stage: HTMLElement) => stage.querySelector('[aria-hidden]')!
const imageOf = (stage: HTMLElement) => stage.querySelector('img')!

function expectCovered(stage: HTMLElement) {
  const frame = rect(frameOf(stage))
  const image = rect(imageOf(stage))
  expect(image.left).toBeLessThanOrEqual(frame.left + 0.5)
  expect(image.top).toBeLessThanOrEqual(frame.top + 0.5)
  expect(image.right).toBeGreaterThanOrEqual(frame.right - 0.5)
  expect(image.bottom).toBeGreaterThanOrEqual(frame.bottom - 0.5)
}

describe('ImageCrop on load', () => {
  it('reports the centred crop that covers the frame, once', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    expect(last().area).toEqual({ x: 0, y: 200, width: 2400, height: 1200 })
    expect(last().zoom).toBeCloseTo(544 / 2400)
    expect(rect(frameOf(stage)).width).toBeCloseTo(544)
    expectCovered(stage)
    // Effects from the report have run by the next two frames.
    await nextFrames()
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('starts a new image from its own centred crop', async () => {
    const { stage, onValueChange, last, update } = await renderCrop()
    stage.focus()
    await userEvent.keyboard('{ArrowUp}')
    update({ src: square })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(3))
    const { x, y, width, height } = last().area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 400, 1600, 800])
  })

  it('starts a new image centred when the parent kept a copy', async () => {
    const { stage, onValueChange, last, update } = await renderCrop()
    stage.focus()
    await userEvent.keyboard('{ArrowUp}')
    // A parent that stores a copy, such as one rounded for saving.
    const kept = structuredClone(last())
    update({ value: kept })
    update({ value: kept, src: square })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(3))
    const { x, y, width, height } = last().area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 400, 1600, 800])
  })

  it('starts a new image centred after an untouched defaultValue', async () => {
    const onValueChange = vi.fn<(value: ImageCropValue) => void>()
    const area = { x: 600, y: 400, width: 1200, height: 600 }
    const crop = (src: Blob) => (
      <div style={{ width: 640 }}>
        <ImageCrop
          src={src}
          aspectRatio={2}
          defaultValue={{ area, percent: area, zoom: 1, rotation: 0 }}
          onValueChange={onValueChange}
        />
      </div>
    )
    const { rerender } = render(crop(photo))
    // The value fits the photo, so it shows as given and nothing is reported.
    await waitFor(() =>
      expect(
        rect(screen.getByRole('group').querySelector('img')!).width
      ).toBeCloseTo(2400 * (544 / 1200))
    )
    rerender(crop(square))
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))
    const { x, y, width, height } = onValueChange.mock.lastCall![0].area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 400, 1600, 800])
  })

  it('keeps a value given with a new image', async () => {
    const { stage, onValueChange, update } = await renderCrop()
    const area = { x: 0, y: 0, width: 1600, height: 800 }
    update({
      src: square,
      value: { area, percent: area, zoom: 1, rotation: 0 }
    })
    // The square shows 544px tall once loaded; the photo was 363px.
    await waitFor(() => expect(rect(imageOf(stage)).height).toBeCloseTo(544))
    await nextFrames()
    expect(rect(imageOf(stage)).top).toBeCloseTo(rect(frameOf(stage)).top)
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('reports a value that does not fit, whatever zoom it carries', async () => {
    const onValueChange = vi.fn()
    const area = { x: 0, y: 900, width: 2400, height: 1200 }
    render(
      <div style={{ width: 640 }}>
        <ImageCrop
          src={photo}
          aspectRatio={2}
          defaultValue={{ area, percent: area, zoom: 0, rotation: 0 }}
          onValueChange={onValueChange}
        />
      </div>
    )
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))
    expect(onValueChange.mock.lastCall![0].area.y).toBe(400)
  })

  it('keeps a value that fits, and reports nothing', async () => {
    const onValueChange = vi.fn()
    const area = { x: 600, y: 400, width: 1200, height: 600 }
    render(
      <div style={{ width: 640 }}>
        <ImageCrop
          src={photo}
          aspectRatio={2}
          defaultValue={{ area, percent: area, zoom: 1, rotation: 0 }}
          onValueChange={onValueChange}
        />
      </div>
    )
    const image = await waitFor(() => {
      const element = screen.getByRole('group').querySelector('img')!
      expect(element).toBeVisible()
      return element
    })
    expect(rect(image).width).toBeCloseTo(2400 * (544 / 1200))
    await nextFrames()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('ImageCrop with a pointer', () => {
  it('pans on a drag and reports once, on release', async () => {
    await commands.parkPointer()
    const { stage, onValueChange, last } = await renderCrop()
    const { x, y } = rect(stage)
    const zoom = last().zoom
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 240 },
      { type: 'down' },
      { type: 'move', x: x + 320, y: y + 270, steps: 6 }
    ])
    expect(stage).toHaveAttribute('data-active')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await commands.pointer([{ type: 'up' }])
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(last().area.y).toBeCloseTo(200 - 30 / zoom, 0)
    expect(stage).not.toHaveAttribute('data-active')
  })

  it('ends a drag when the stage loses the pointer', async () => {
    await commands.parkPointer()
    const { stage, onValueChange } = await renderCrop()
    let pointerId = 0
    stage.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId
    })
    const { x, y } = rect(stage)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 240 },
      { type: 'down' },
      { type: 'move', x: x + 320, y: y + 270, steps: 6 }
    ])
    stage.dispatchEvent(
      new PointerEvent('lostpointercapture', { pointerId, bubbles: true })
    )
    await waitFor(() => expect(stage).not.toHaveAttribute('data-active'))
    expect(onValueChange).toHaveBeenCalledTimes(2)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 300, steps: 3 },
      { type: 'up' }
    ])
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  it('ignores keys while a pointer is down', async () => {
    await commands.parkPointer()
    const { stage, onValueChange } = await renderCrop()
    const { x, y } = rect(stage)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 240 },
      { type: 'down' }
    ])
    expect(stage).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    await commands.pointer([{ type: 'up' }])
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('ends a drag unreported when the image changes under it', async () => {
    await commands.parkPointer()
    const { stage, onValueChange, last, update } = await renderCrop()
    const { x, y } = rect(stage)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 240 },
      { type: 'down' },
      { type: 'move', x: x + 320, y: y + 270, steps: 6 }
    ])
    update({ src: square })
    // The square shows 544px tall once loaded, and reports its centred crop.
    await waitFor(() => expect(rect(imageOf(stage)).height).toBeCloseTo(544))
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    const top = rect(imageOf(stage)).top
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 330, steps: 6 },
      { type: 'up' }
    ])
    await nextFrames()
    expect(rect(imageOf(stage)).top).toBeCloseTo(top)
    expect(onValueChange).toHaveBeenCalledTimes(2)
    const { x: left, y: down, width, height } = last().area
    expect([left, down, width, height].map(Math.round)).toEqual([
      0, 400, 1600, 800
    ])
  })

  it('stops at the edge, so the image still covers the frame', async () => {
    await commands.parkPointer()
    const { stage, last } = await renderCrop()
    const { x, y } = rect(stage)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 100 },
      { type: 'down' },
      { type: 'move', x: x + 600, y: y + 460, steps: 6 },
      { type: 'up' }
    ])
    expect(last().area).toMatchObject({ x: 0, y: 0 })
    expectCovered(stage)
  })
})

describe('ImageCrop with the wheel', () => {
  const wheel = (stage: HTMLElement, deltaY: number) => {
    const { x, y, width, height } = rect(stage)
    const event = new WheelEvent('wheel', {
      deltaY,
      clientX: x + width / 2,
      clientY: y + height / 2,
      bubbles: true,
      cancelable: true
    })
    stage.dispatchEvent(event)
    return event
  }

  it('leaves a plain wheel to the page until the stage has focus', async () => {
    const { stage, onValueChange } = await renderCrop()
    expect(wheel(stage, -100).defaultPrevented).toBe(false)
    // An ignored wheel starts no gesture, so nothing settles later.
    await new Promise(requestAnimationFrame)
    expect(stage).not.toHaveAttribute('data-active')
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('zooms once focused, and reports once the burst ends', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    const before = last().zoom
    stage.focus()
    for (let i = 0; i < 5; i++)
      expect(wheel(stage, -40).defaultPrevented).toBe(true)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    expect(last().zoom).toBeGreaterThan(before)
    expectCovered(stage)
  })
})

describe('ImageCrop with the wheel mid-gesture', () => {
  const wheel = (stage: HTMLElement) => {
    const { x, y, width, height } = rect(stage)
    const event = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: x + width / 2,
      clientY: y + height / 2,
      bubbles: true,
      cancelable: true
    })
    stage.dispatchEvent(event)
    return event
  }

  it('keeps the page still under a wheel mid-drag, and does not zoom', async () => {
    await commands.parkPointer()
    const { stage, last } = await renderCrop()
    const zoom = last().zoom
    const { x, y } = rect(stage)
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 240 },
      { type: 'down' },
      { type: 'move', x: x + 320, y: y + 270, steps: 6 }
    ])
    expect(wheel(stage).defaultPrevented).toBe(true)
    await commands.pointer([{ type: 'up' }])
    expect(last().zoom).toBeCloseTo(zoom)
  })

  it('drops a zoom still settling when the image changes', async () => {
    const { stage, onValueChange, last, update } = await renderCrop()
    stage.focus()
    wheel(stage)
    update({ src: square })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(stage).not.toHaveAttribute('data-active'))
    await nextFrames()
    expect(onValueChange).toHaveBeenCalledTimes(2)
    const { x, y, width, height } = last().area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 400, 1600, 800])
  })
})

describe('ImageCrop with the keyboard', () => {
  it('moves the image with the arrows, further with Shift', async () => {
    const { stage, last } = await renderCrop()
    const zoom = last().zoom
    stage.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(last().area.y).toBeCloseTo(200 + 10 / zoom)
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(last().area.y).toBeCloseTo(200 - 40 / zoom)
  })

  it('zooms with + and -, and reports each press', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    const zoom = last().zoom
    stage.focus()
    await userEvent.keyboard('+')
    expect(last().zoom).toBeCloseTo(zoom * 1.1)
    await userEvent.keyboard('-')
    expect(last().zoom).toBeCloseTo(zoom)
    expect(onValueChange).toHaveBeenCalledTimes(3)
  })

  it('stops zooming at the minimum crop', async () => {
    const { stage, onValueChange, last } = await renderCrop({
      minWidth: 1200,
      minHeight: 600
    })
    stage.focus()
    for (let i = 0; i < 12; i++) await userEvent.keyboard('+')
    expect(last().area.width).toBeCloseTo(1200)
    const calls = onValueChange.mock.calls.length
    await userEvent.keyboard('+')
    expect(onValueChange).toHaveBeenCalledTimes(calls)
  })

  it('still moves a small image zoomed far in', async () => {
    const { stage, last } = await renderCrop({ src: tiny })
    stage.focus()
    for (let i = 0; i < 30; i++) await userEvent.keyboard('+')
    const before = last().area.x
    await userEvent.keyboard('{ArrowRight}')
    expect(last().area.x).toBeCloseTo(before - 10 / last().zoom)
  })

  it('ignores keys while a wheel zoom is settling', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    stage.focus()
    const { x, y, width, height } = rect(stage)
    stage.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: x + width / 2,
        clientY: y + height / 2,
        bubbles: true,
        cancelable: true
      })
    )
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    await nextFrames()
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expectCovered(stage)
    expect(last().zoom).toBeGreaterThan(544 / 2400)
  })
})

describe('ImageCrop with a circle', () => {
  it('masks a circle and still reports a rectangle', async () => {
    const { stage, last } = await renderCrop({
      aspectRatio: 1,
      shape: 'circle'
    })
    expect(getComputedStyle(frameOf(stage)).borderRadius).not.toBe('0px')
    expect(last().area).toEqual({ x: 400, y: 0, width: 1600, height: 1600 })
  })
})
