// @vitest-environment jsdom
import type { MouseEvent } from 'react'

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useDocHeadings } from './OnThisPage'

vi.mock('next/navigation', () => ({ usePathname: () => '/charts/meter' }))

const scrolledTo: Element[] = []

beforeAll(() => {
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolledTo.push(this)
  }
  // jsdom has none; the resize it reports is covered in e2e/on-this-page.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

// Unmounting cancels the highlight frame, which would otherwise render after jsdom closes.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
  scrolledTo.length = 0
  Reflect.deleteProperty(window, 'navigation')
})

const PAGE =
  '<h2 id="api-reference">API reference</h2><h3 id="meter">Meter</h3><h3 id="api-meter">Meter</h3>'

function addContent(html = PAGE) {
  const content = document.createElement('div')
  content.id = 'docs-content'
  content.innerHTML = html
  document.body.append(content)
  return content
}

function mountPage(html?: string) {
  const content = addContent(html)
  const { result } = renderHook(() => useDocHeadings())
  return { content, result }
}

// landOn's timers would fire after jsdom closes; faking them file-wide stalls waitFor.
function landing<T>(start: () => T) {
  vi.useFakeTimers()
  try {
    const started = start()
    act(() => vi.runAllTimers())
    return started
  } finally {
    vi.useRealTimers()
  }
}

const event = {
  defaultPrevented: false,
  preventDefault: () => {}
} as MouseEvent<HTMLAnchorElement>

/** A stand-in for the Navigation API, which jsdom lacks. */
function stubNavigation() {
  const navigation = new EventTarget()
  Object.defineProperty(window, 'navigation', {
    configurable: true,
    value: navigation
  })
  return navigation
}

describe('useDocHeadings', () => {
  // The layout's effect can run before the page content hydrates, so writing
  // ids then makes React report a hydration mismatch.
  it('lists only headings that render with an id, and never writes one', () => {
    const { content, result } = mountPage(`${PAGE}<h3>Unanchored</h3>`)
    expect(result.current.headings.map((h) => h.id)).toEqual([
      'api-reference',
      'meter',
      'api-meter'
    ])
    landing(() => act(() => result.current.onSelect(event, 'api-meter')))
    expect(content.querySelectorAll('[id]')).toHaveLength(3)
    expect(window.location.hash).toBe('#api-meter')
  })

  it('follows headings the page replaces after collecting', async () => {
    const { content, result } = mountPage()
    content.innerHTML =
      '<h2 id="api-reference">API reference</h2><h3 id="api-stattile">StatTile</h3>'
    await waitFor(() =>
      expect(result.current.headings.map((h) => h.id)).toEqual([
        'api-reference',
        'api-stattile'
      ])
    )
    landing(() => act(() => result.current.onSelect(event, 'api-stattile')))
    expect(scrolledTo).toEqual([content.querySelector('#api-stattile')])
  })

  it('follows a content wrapper that streaming replaces after collecting', async () => {
    const { content, result } = mountPage()
    const next = document.createElement('div')
    next.id = 'docs-content'
    next.innerHTML =
      '<h2 id="api-reference">API reference</h2><h3 id="api-stattile">StatTile</h3>'
    content.replaceWith(next)
    await waitFor(() =>
      expect(result.current.headings.map((h) => h.id)).toEqual([
        'api-reference',
        'api-stattile'
      ])
    )
    landing(() => act(() => result.current.onSelect(event, 'api-stattile')))
    expect(scrolledTo).toEqual([next.querySelector('#api-stattile')])
  })

  it('lands on the heading the URL hash names', () => {
    window.history.replaceState(null, '', '#api-meter')
    const { content } = landing(mountPage)
    expect(scrolledTo).toEqual([content.querySelector('#api-meter')])
  })

  // Next's router changes the hash with pushState, which fires no hashchange.
  it('lands on a hash the router pushes', () => {
    const navigation = stubNavigation()
    const { content } = mountPage()
    landing(() => {
      window.history.pushState(null, '', '#meter')
      navigation.dispatchEvent(new Event('currententrychange'))
    })
    expect(scrolledTo).toEqual([content.querySelector('#meter')])
  })

  it('leaves the landing to a clicked heading when its hash reaches the URL', () => {
    const navigation = stubNavigation()
    const { content, result } = mountPage()
    landing(() => {
      act(() => result.current.onSelect(event, 'api-meter'))
      navigation.dispatchEvent(new Event('currententrychange'))
    })
    expect(scrolledTo).toEqual([content.querySelector('#api-meter')])
  })

  it('leaves out headings inside a live example as it renders', async () => {
    const { content, result } = mountPage()
    const example = document.createElement('div')
    example.dataset.liveExample = 'rendered'
    example.innerHTML = '<h2 id="demo-heading">Demo heading</h2>'
    const before = result.current.headings
    content.append(example)
    // Each mutation collects afresh, so a new list shows it has looked.
    await waitFor(() => expect(result.current.headings).not.toBe(before))
    expect(result.current.headings.map((h) => h.id)).toEqual([
      'api-reference',
      'meter',
      'api-meter'
    ])
  })
})
