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
const frameOf = (stage: HTMLElement) =>
  stage.querySelector('[data-slot="image-crop-frame"]')!
const sizeOf = (stage: HTMLElement) =>
  stage.querySelector('[data-slot="image-crop-size"]')!
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

  it('starts a new image centred when the parent copies on every render', async () => {
    const { stage, onValueChange, last, update } = await renderCrop()
    stage.focus()
    await userEvent.keyboard('{ArrowUp}')
    // A parent that builds a fresh copy each render, as without React Compiler.
    const kept = structuredClone(last())
    update({ value: { ...kept } })
    update({ value: { ...kept }, src: square })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(3))
    const { x, y, width, height } = last().area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 400, 1600, 800])
  })

  it('keeps a crop the user moves back to on a same-size image', async () => {
    const { stage, onValueChange, last, update } = await renderCrop()
    stage.focus()
    await userEvent.keyboard('{ArrowUp}')
    const old = structuredClone(last())
    update({ value: { ...old } })
    await nextFrames()
    // Where the old crop sits on screen; the twin is the same size.
    const top = rect(imageOf(stage)).top
    const twin = await makePhoto(2400, 1600)
    update({ value: { ...old }, src: twin })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(3))
    update({ value: { ...last() }, src: twin })
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(4))
    expect(last().area.y).toBeCloseTo(old.area.y)
    update({ value: { ...last() }, src: twin })
    await nextFrames()
    expect(rect(imageOf(stage)).top).toBeCloseTo(top)
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
        rect(document.querySelector('[data-slot="image-crop"] img')!).width
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
      const element = document.querySelector('[data-slot="image-crop"] img')!
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

  it('stretches past the edge, then springs back to cover', async () => {
    await commands.parkPointer()
    const { stage, last } = await renderCrop()
    const { x, y } = rect(stage)
    const frame = rect(frameOf(stage))
    await commands.pointer([
      { type: 'move', x: x + 320, y: y + 100 },
      { type: 'down' },
      { type: 'move', x: x + 600, y: y + 460, steps: 6 }
    ])
    // 280px past the left edge, the image gives way, but by less.
    const stretched = rect(imageOf(stage)).left - frame.left
    expect(stretched).toBeGreaterThan(20)
    expect(stretched).toBeLessThan(280)
    await commands.pointer([{ type: 'up' }])
    expect(last().area).toMatchObject({ x: 0, y: 0 })
    // It springs on --ease-spring, so it is still on its way back for a moment.
    expect(stage).toHaveAttribute('data-settling')
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    // On a loaded runner the spring can start a frame late, so it lands by
    // the end of its transition rather than exactly when the stage settles.
    await waitFor(() => expectCovered(stage))
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

// Touch pointers, dispatched, since only Chromium can drive two fingers. In
// screen px from the stage's centre.
function fingers(stage: HTMLElement) {
  const send = (type: string, pointerId: number, x: number, y: number) => {
    const box = rect(stage)
    stage.dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        pointerType: 'touch',
        isPrimary: pointerId === 1,
        clientX: box.x + box.width / 2 + x,
        clientY: box.y + box.height / 2 + y,
        bubbles: true,
        cancelable: true
      })
    )
  }
  return {
    down: (id: number, x: number, y: number) => send('pointerdown', id, x, y),
    move: (id: number, x: number, y: number) => send('pointermove', id, x, y),
    up: (id: number, x: number, y: number) => send('pointerup', id, x, y)
  }
}

const cover = 544 / 2400

describe('ImageCrop with a pinch', () => {
  it('zooms about the midpoint, and reports once both fingers lift', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    const touch = fingers(stage)
    touch.down(1, 50, 0)
    touch.down(2, 150, 0)
    for (let step = 1; step <= 5; step++) {
      touch.move(1, 50 - step * 10, 0)
      touch.move(2, 150 + step * 10, 0)
    }
    touch.up(1, 0, 0)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    touch.up(2, 200, 0)
    expect(onValueChange).toHaveBeenCalledTimes(2)
    // Twice as far apart is twice the zoom, and the point under the
    // midpoint, 100px right of centre, stays under it.
    expect(last().zoom).toBeCloseTo(cover * 2)
    expect(last().area.x).toBeCloseTo(1200 + 100 / (cover * 2) - 600, 0)
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    expectCovered(stage)
  })

  it('stretches past cover, then springs back', async () => {
    const { stage, onValueChange } = await renderCrop()
    const touch = fingers(stage)
    touch.down(1, -100, 0)
    touch.down(2, 100, 0)
    touch.move(1, -25, 0)
    touch.move(2, 25, 0)
    // A quarter of the zoom asks for less than cover, so it gives way.
    expect(rect(imageOf(stage)).width).toBeLessThan(544)
    expect(rect(imageOf(stage)).width).toBeGreaterThan(544 / 4)
    touch.up(1, -25, 0)
    touch.up(2, 25, 0)
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    expectCovered(stage)
    // It ended where it started, so there's nothing to report.
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('ends a pinch unreported when the image changes under it', async () => {
    const { stage, onValueChange, update } = await renderCrop()
    const touch = fingers(stage)
    touch.down(1, -50, 0)
    touch.down(2, 50, 0)
    touch.move(2, 80, 0)
    update({ src: square })
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    touch.move(1, -150, 0)
    touch.up(1, -150, 0)
    touch.up(2, 150, 0)
    await nextFrames()
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })
})

describe('ImageCrop with a double-tap', () => {
  it('zooms to 2× at the tap, then back out to fit', async () => {
    const { stage, last } = await renderCrop()
    const touch = fingers(stage)
    const tap = () => {
      touch.down(1, 0, 0)
      touch.up(1, 0, 0)
    }
    tap()
    tap()
    expect(last().zoom).toBeCloseTo(cover * 2)
    await waitFor(() => expect(stage).toHaveAttribute('data-settling'))
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    tap()
    tap()
    expect(last().zoom).toBeCloseTo(cover)
  })
})

describe('ImageCrop with a trackpad pinch', () => {
  it('zooms at the cursor without focus', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    const box = rect(stage)
    const event = new WheelEvent('wheel', {
      deltaY: -20,
      ctrlKey: true,
      clientX: box.x + box.width / 2 + 200,
      clientY: box.y + box.height / 2,
      bubbles: true,
      cancelable: true
    })
    stage.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))
    const { area, zoom } = last()
    expect(zoom).toBeGreaterThan(cover)
    // The natural point under the cursor stays under it.
    expect(area.x + area.width / 2 + 200 / zoom).toBeCloseTo(
      1200 + 200 / cover,
      0
    )
  })
})

describe('ImageCrop controls', () => {
  it('turns left with the button or R, springing, and reports each', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(last().rotation).toBe(270)
    const { x, y, width, height } = last().area
    expect([x, y, width, height].map(Math.round)).toEqual([0, 800, 1600, 800])
    expect(stage).toHaveAttribute('data-settling')
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    expectCovered(stage)
    stage.focus()
    await userEvent.keyboard('r')
    expect(last().rotation).toBe(180)
  })

  it('turns the short way round, from 0° to 270°', async () => {
    const { stage } = await renderCrop()
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
    expect(imageOf(stage).style.transform).toContain('rotate(-90deg)')
  })

  it('shows Reset once the crop moves, and springs back with it', async () => {
    const { stage, last } = await renderCrop()
    // Hidden, it has no accessible name to find it by.
    const reset = document.querySelector<HTMLElement>(
      '[aria-label="Reset crop"]'
    )!
    expect(reset).not.toBeVisible()
    stage.focus()
    await userEvent.keyboard('{ArrowUp}++')
    expect(reset).toBeVisible()
    await userEvent.click(reset)
    expect(last().area).toEqual({ x: 0, y: 200, width: 2400, height: 1200 })
    expect(last().rotation).toBe(0)
    expect(reset).not.toBeVisible()
    expect(stage).toHaveFocus()
  })

  it('zooms with the slider, reporting each key press', async () => {
    const { onValueChange, last } = await renderCrop()
    const slider = screen.getByRole('slider', { name: 'Zoom' })
    expect(slider).toHaveAttribute('aria-valuetext', '100%')
    slider.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(onValueChange).toHaveBeenCalledTimes(3)
    expect(last().zoom).toBeGreaterThan(cover)
    expect(slider.getAttribute('aria-valuetext')).not.toBe('100%')
  })

  it('caps the size chip at the minimum crop, and nudges past it', async () => {
    const { stage, onValueChange } = await renderCrop({
      minWidth: 1200,
      minHeight: 600
    })
    expect(sizeOf(stage)).toHaveTextContent('2400 × 1200px')
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    for (let press = 0; press < 4; press++) await userEvent.click(zoomIn)
    expect(sizeOf(stage)).toHaveTextContent('1200 × 600px · smallest crop')
    expect(sizeOf(stage)).toHaveAttribute('data-capped')
    expect(sizeOf(stage)).not.toHaveClass('animate-nudge')
    const calls = onValueChange.mock.calls.length
    await userEvent.click(zoomIn)
    expect(sizeOf(stage)).toHaveClass('animate-nudge')
    expect(onValueChange).toHaveBeenCalledTimes(calls)
  })

  it('says the crop once it settles', async () => {
    await renderCrop()
    const status = screen.getByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
    expect(status).toBeEmptyDOMElement()
    await waitFor(() =>
      expect(status).toHaveTextContent(
        'Crop 1600 by 800 pixels, zoom 100 percent, turned 90 degrees left.'
      )
    )
  })

  it('drops − and + on a narrow crop', async () => {
    render(
      <div style={{ width: 360 }}>
        <ImageCrop src={photo} aspectRatio={2} />
      </div>
    )
    expect(document.querySelector('[aria-label="Zoom in"]')).not.toBeVisible()
    expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument()
  })
})

describe('ImageCrop gestures that overlap', () => {
  const wheel = (stage: HTMLElement) => {
    const box = rect(stage)
    stage.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -60,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
        bubbles: true,
        cancelable: true
      })
    )
  }

  it('folds a settling wheel zoom into the drag that follows, reporting once', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    stage.focus()
    wheel(stage)
    const touch = fingers(stage)
    touch.down(1, 0, 0)
    touch.move(1, 20, 0)
    // Long past the wheel's settle time, with the finger still down.
    // Nothing happens to wait on: the wheel's 150ms settle must pass unreported.
    // eslint-disable-next-line roadie/no-fixed-sleep
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    touch.up(1, 20, 0)
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(last().zoom).toBeGreaterThan(cover)
  })

  it('lets the slider win over a wheel zoom still settling', async () => {
    const { stage, onValueChange, last } = await renderCrop()
    stage.focus()
    wheel(stage)
    const slider = screen.getByRole('slider', { name: 'Zoom' })
    slider.focus()
    await userEvent.keyboard('{End}')
    const zoom = last().zoom
    // Nothing happens to wait on: the wheel's 150ms settle must pass unreported.
    // eslint-disable-next-line roadie/no-fixed-sleep
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(last().zoom).toBe(zoom)
  })

  it('keeps the slider preview on screen through a re-render', async () => {
    await commands.parkPointer()
    const { stage } = await renderCrop()
    const track = document
      .querySelector('[data-slot="slider-control"]')!
      .getBoundingClientRect()
    await commands.pointer([
      { type: 'move', x: track.left + 2, y: track.top + track.height / 2 },
      { type: 'down' },
      {
        type: 'move',
        x: track.right - 10,
        y: track.top + track.height / 2,
        steps: 4
      }
    ])
    await nextFrames()
    expect(rect(imageOf(stage)).width).toBeGreaterThan(2400 * cover * 1.5)
    await commands.pointer([{ type: 'up' }])
  })
})

// Free-form: the 3:2 photo's frame is 544 × 362.67 inside the 544 × 384 bounds.
describe('ImageCrop in free-form', () => {
  const freeZoom = 544 / 2400
  const renderFree = (props: Partial<ImageCropProps> = {}) =>
    renderCrop({ aspectRatio: undefined, ...props })
  const corner = (name: string) => screen.getByRole('button', { name })

  // A touch on a handle, dispatched, in px from the handle's centre.
  const press = (handle: HTMLElement) => {
    const box = rect(handle)
    const send = (type: string, x: number, y: number) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX: box.x + box.width / 2 + x,
          clientY: box.y + box.height / 2 + y,
          bubbles: true,
          cancelable: true
        })
      )
    send('pointerdown', 0, 0)
    return {
      move: (x: number, y: number) => send('pointermove', x, y),
      up: (x: number, y: number) => send('pointerup', x, y)
    }
  }

  it('lets a control win over a handle held down', async () => {
    const { onValueChange, last } = await renderFree()
    const drag = press(corner('Bottom right corner'))
    drag.move(-40, -20)
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
    const calls = onValueChange.mock.calls.length
    expect(last().rotation).toBe(270)
    drag.move(-80, -40)
    drag.up(-80, -40)
    expect(onValueChange).toHaveBeenCalledTimes(calls)
    expect(last().rotation).toBe(270)
  })

  it('resizes from a handle pressed while a wheel zoom settles', async () => {
    const { stage, last } = await renderFree()
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
    const drag = press(corner('Bottom right corner'))
    drag.move(-40, 0)
    drag.up(-40, 0)
    // Zoomed in by the wheel, then narrowed by the drag, in one report.
    expect(last().zoom).toBeGreaterThan(freeZoom)
    expect(last().area.width / last().area.height).toBeLessThan(1.4)
  })

  it('starts with the whole image and four corner handles', async () => {
    const { stage, last } = await renderFree()
    expect(last().area).toEqual({ x: 0, y: 0, width: 2400, height: 1600 })
    expect(rect(frameOf(stage)).width).toBeCloseTo(544)
    expect(rect(frameOf(stage)).height).toBeCloseTo(1600 * freeZoom, 1)
    for (const name of ['Top left', 'Top right', 'Bottom left', 'Bottom right'])
      expect(corner(`${name} corner`)).toHaveAttribute(
        'aria-roledescription',
        'resize handle'
      )
    await waitFor(() => expectCovered(stage))
  })

  it('resizes about the centre from a corner, then fills the stage', async () => {
    await commands.parkPointer()
    const { stage, onValueChange, last } = await renderFree()
    const frame = rect(frameOf(stage))
    await commands.pointer([
      { type: 'move', x: frame.right, y: frame.bottom },
      { type: 'down' },
      { type: 'move', x: frame.right - 72, y: frame.bottom - 40, steps: 4 }
    ])
    // Both sides shrink by twice the drag, and the image stays put.
    expect(rect(frameOf(stage)).width).toBeCloseTo(544 - 144, 0)
    expect(rect(frameOf(stage)).height).toBeCloseTo(frame.height - 80, 0)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await commands.pointer([{ type: 'up' }])
    expect(onValueChange).toHaveBeenCalledTimes(2)
    const { area } = last()
    expect(area.width).toBeCloseTo(400 / freeZoom, 0)
    expect(area.height).toBeCloseTo((frame.height - 80) / freeZoom, 0)
    expect(area.x + area.width / 2).toBeCloseTo(1200, 0)
    expect(area.y + area.height / 2).toBeCloseTo(800, 0)
    // Taller than the bounds' shape now, so it fills their height.
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    expect(rect(frameOf(stage)).height).toBeCloseTo(384, 0)
    await waitFor(() => expectCovered(stage))
  })

  it('resizes one side from an edge', async () => {
    await commands.parkPointer()
    const { stage, last } = await renderFree()
    const frame = rect(frameOf(stage))
    const middle = frame.top + frame.height / 2
    await commands.pointer([
      { type: 'move', x: frame.right, y: middle },
      { type: 'down' },
      { type: 'move', x: frame.right - 50, y: middle, steps: 4 },
      { type: 'up' }
    ])
    expect(last().area.width).toBeCloseTo(2400 - 100 / freeZoom, 0)
    expect(last().area.height).toBeCloseTo(1600)
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    await waitFor(() => expectCovered(stage))
  })

  it('zooms in to keep the image covering a frame dragged past it', async () => {
    await commands.parkPointer()
    const { stage, last } = await renderFree()
    const frame = rect(frameOf(stage))
    await commands.pointer([
      { type: 'move', x: frame.right, y: frame.bottom },
      { type: 'down' },
      { type: 'move', x: frame.right, y: frame.bottom + 40, steps: 4 }
    ])
    // The frame stops at the bounds, 384px tall, mid-drag.
    expect(rect(frameOf(stage)).height).toBeCloseTo(384, 0)
    await commands.pointer([{ type: 'up' }])
    expect(last().area.height).toBeCloseTo(1600)
    expect(last().area.width).toBeLessThan(2400)
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    await waitFor(() => expectCovered(stage))
  })

  it('resizes with the arrow keys on a corner, and stops at the minimum', async () => {
    const { stage, onValueChange, last } = await renderFree({ minWidth: 2000 })
    corner('Bottom right corner').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(last().area.width).toBeCloseTo(2400 - 20 / freeZoom, 0)
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(last().area.width).toBe(2000)
    const calls = onValueChange.mock.calls.length
    expect(sizeOf(stage)).not.toHaveClass('animate-nudge')
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(onValueChange).toHaveBeenCalledTimes(calls)
    expect(sizeOf(stage)).toHaveClass('animate-nudge')
    // Moving the corner out grows the crop again.
    await userEvent.keyboard('{ArrowRight}')
    expect(last().area.width).toBeGreaterThan(2000)
    // A key on a handle is the handle's, not the stage's.
    expect(last().area.y).toBe(0)
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    await waitFor(() => expectCovered(stage))
  })

  it('stops a drag at a frame two handles wide', async () => {
    await commands.parkPointer()
    const { stage } = await renderFree()
    const frame = rect(frameOf(stage))
    await commands.pointer([
      { type: 'move', x: frame.right, y: frame.bottom },
      { type: 'down' },
      { type: 'move', x: frame.left, y: frame.top, steps: 4 }
    ])
    expect(rect(frameOf(stage)).width).toBeCloseTo(88, 0)
    expect(rect(frameOf(stage)).height).toBeCloseTo(88, 0)
    await commands.pointer([{ type: 'up' }])
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    await waitFor(() => expectCovered(stage))
  })

  it('stops the arrow keys at a frame two handles wide, as a drag does', async () => {
    const { stage, last } = await renderFree()
    corner('Bottom right corner').focus()
    for (let i = 0; i < 10; i++)
      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    await waitFor(() =>
      expect(rect(frameOf(stage)).width).toBeGreaterThanOrEqual(87.5)
    )
    expect(last().area.width * last().zoom).toBeGreaterThanOrEqual(87.5)
  })

  it('turns the frame with the image, then resets to the whole image', async () => {
    const { stage, last } = await renderFree()
    stage.focus()
    await userEvent.keyboard('r')
    expect(last().area.width).toBeCloseTo(1600)
    expect(last().area.height).toBeCloseTo(2400)
    // onValueChange runs before the render that springs the frame, so wait
    // for the frame itself rather than the settle, which may not have begun.
    await waitFor(() => expect(rect(frameOf(stage)).height).toBeCloseTo(384, 0))
    await waitFor(() => expect(stage).not.toHaveAttribute('data-settling'))
    await waitFor(() => expectCovered(stage))
    screen.getByRole('button', { name: 'Reset crop' }).click()
    await waitFor(() => expect(last().rotation).toBe(0))
    expect(last().area).toEqual({ x: 0, y: 0, width: 2400, height: 1600 })
    await waitFor(() => expect(rect(frameOf(stage)).width).toBeCloseTo(544))
  })
})
