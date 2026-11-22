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

let removeStylesheet = () => {}
let photo: Blob
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  const canvas = document.createElement('canvas')
  canvas.width = 2400
  canvas.height = 1600
  const context = canvas.getContext('2d')!
  context.fillStyle = '#3a6'
  context.fillRect(0, 0, 2400, 1600)
  photo = await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!))
  )
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// A 640px stage is 480px tall, so a 2:1 frame is 544 × 272 inside its 48px inset.
async function renderCrop(props: Partial<ImageCropProps> = {}) {
  const onValueChange = vi.fn<(value: ImageCropValue) => void>()
  render(
    <div style={{ width: 640 }}>
      <ImageCrop
        src={photo}
        aspectRatio={2}
        label='Event image'
        onValueChange={onValueChange}
        {...props}
      />
    </div>
  )
  await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1))
  const stage = screen.getByRole('group', { name: 'Event image' })
  const last = () => onValueChange.mock.lastCall![0]
  return { stage, onValueChange, last }
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
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    expect(onValueChange).toHaveBeenCalledTimes(1)
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
