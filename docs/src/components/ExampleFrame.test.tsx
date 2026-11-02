// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ExampleFrame } from './ExampleFrame'

vi.mock('./LazyLiveRunner', () => ({
  LazyLiveRunner: (props: { code: string; previewLayout?: string }) => (
    <p data-layout={props.previewLayout}>Running {props.code}</p>
  )
}))

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
})

const example = {
  code: '<Badge>New</Badge>',
  language: 'tsx-live',
  previewLayout: 'flex gap-2',
  root: { className: 'dark', style: '--accent-hue: 200;' }
}

function fromParent(data: unknown, source: Window | null = window.parent) {
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

describe('ExampleFrame', () => {
  it('tells the docs page it is ready for an example', () => {
    const post = vi.spyOn(window.parent, 'postMessage')
    render(<ExampleFrame />)

    expect(post).toHaveBeenCalledWith(
      { type: 'roadie-example-ready' },
      window.location.origin
    )
  })

  it('runs the example the docs page sends, in the page theme', () => {
    render(<ExampleFrame />)

    fromParent({ type: 'roadie-example', example })

    expect(screen.getByText('Running <Badge>New</Badge>').dataset.layout).toBe(
      'flex gap-2'
    )
    expect(document.documentElement.className).toBe('dark')
    expect(document.documentElement.getAttribute('style')).toBe(
      '--accent-hue: 200;'
    )
  })

  it('ignores examples from another origin', () => {
    render(<ExampleFrame />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'roadie-example', example },
          source: window.parent,
          origin: 'https://elsewhere.example'
        })
      )
    })

    expect(screen.queryByText(/Running/)).toBeNull()
  })
})
