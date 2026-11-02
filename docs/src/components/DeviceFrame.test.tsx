// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceFrame } from './DeviceFrame'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const example = { code: '<Badge>New</Badge>', language: 'tsx-live' }

function renderFrame(props: Partial<Parameters<typeof DeviceFrame>[0]> = {}) {
  render(<DeviceFrame device='phone' example={example} {...props} />)
  const frame = screen.getByTitle<HTMLIFrameElement>('Example at phone width')
  const post = vi.spyOn(frame.contentWindow!, 'postMessage')
  return { frame, post }
}

function fromFrame(
  frame: HTMLIFrameElement,
  data: unknown,
  source: Window | null = frame.contentWindow
) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        source,
        origin: window.location.origin
      })
    )
  })
}

describe('DeviceFrame', () => {
  it('loads the frame page at the device width', () => {
    const { frame } = renderFrame()

    expect(frame.getAttribute('src')).toBe('/examples/frame/')
    expect(frame.style.width).toBe('375px')
  })

  it('sends the example, with the page theme, once the frame is ready', () => {
    document.documentElement.className = 'dark'
    const { frame, post } = renderFrame()

    fromFrame(frame, { type: 'roadie-example-ready' })

    expect(post).toHaveBeenCalledWith(
      {
        type: 'roadie-example',
        example: {
          ...example,
          root: { className: 'dark', style: '' }
        }
      },
      window.location.origin
    )
    document.documentElement.className = ''
  })

  it('sends edited code to a ready frame', () => {
    const view = render(<DeviceFrame device='phone' example={example} />)
    const frame = screen.getByTitle<HTMLIFrameElement>('Example at phone width')
    const post = vi.spyOn(frame.contentWindow!, 'postMessage')
    fromFrame(frame, { type: 'roadie-example-ready' })

    view.rerender(
      <DeviceFrame
        device='phone'
        example={{ ...example, code: '<Badge>Edited</Badge>' }}
      />
    )

    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        example: expect.objectContaining({ code: '<Badge>Edited</Badge>' })
      }),
      window.location.origin
    )
  })

  it('takes the height the frame reports', () => {
    const { frame } = renderFrame()

    fromFrame(frame, { type: 'roadie-example-height', height: 640 })

    expect(frame.style.height).toBe('640px')
  })

  it('ignores messages from anywhere but its own frame', () => {
    const { frame, post } = renderFrame()

    fromFrame(frame, { type: 'roadie-example-ready' }, window)
    fromFrame(frame, { type: 'roadie-example-height', height: 999 }, window)

    expect(post).not.toHaveBeenCalled()
    expect(frame.style.height).not.toBe('999px')
  })
})
