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
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
  document.getElementById('roadie-accent-theme')?.remove()
})

function accentStyle(css: string) {
  const style = document.createElement('style')
  style.id = 'roadie-accent-theme'
  style.textContent = css
  return style
}

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

  it('sends the example, with the page theme and accent, once the frame is ready', () => {
    document.documentElement.className = 'dark'
    document.documentElement.style.colorScheme = 'dark'
    document.head.append(accentStyle(':root{--accent-hue:20}'))
    const { frame, post } = renderFrame()

    fromFrame(frame, { type: 'roadie-example-ready' })

    expect(post).toHaveBeenCalledWith(
      {
        type: 'roadie-example',
        example: {
          ...example,
          root: {
            className: 'dark',
            colorScheme: 'dark',
            accent: ':root{--accent-hue:20}'
          }
        }
      },
      window.location.origin
    )
  })

  it('leaves out page styles that are not theme, such as a scroll lock', () => {
    document.documentElement.style.overflowY = 'hidden'
    const { frame, post } = renderFrame()

    fromFrame(frame, { type: 'roadie-example-ready' })

    expect(JSON.stringify(post.mock.calls)).not.toContain('overflow')
  })

  it('sends the accent again when the page changes it', async () => {
    const style = accentStyle(':root{--accent-hue:20}')
    document.head.append(style)
    const { frame, post } = renderFrame()
    fromFrame(frame, { type: 'roadie-example-ready' })

    await act(async () => {
      style.textContent = ':root{--accent-hue:300}'
    })

    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        example: expect.objectContaining({
          root: expect.objectContaining({ accent: ':root{--accent-hue:300}' })
        })
      }),
      window.location.origin
    )
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
