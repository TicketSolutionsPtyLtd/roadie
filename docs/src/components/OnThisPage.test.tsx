// @vitest-environment jsdom
import type { MouseEvent } from 'react'

import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { OnThisPage, useDocHeadings } from './OnThisPage'

vi.mock('next/navigation', () => ({ usePathname: () => '/charts/meter' }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

// Unmounting cancels the highlight frame, which would otherwise render after jsdom closes.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function mountPage() {
  const content = document.createElement('div')
  content.id = 'docs-content'
  content.innerHTML =
    '<h2>API reference</h2><h3 id="meter">Meter</h3><h3>Meter</h3>'
  document.body.append(content)
  const { result } = renderHook(() => useDocHeadings())
  return { content, result }
}

const event = {
  defaultPrevented: false,
  preventDefault: () => {}
} as MouseEvent<HTMLAnchorElement>

describe('useDocHeadings', () => {
  // The layout's effect can run before the page content hydrates, so writing
  // ids then makes React report a hydration mismatch.
  it('leaves heading markup alone while collecting', () => {
    const { content, result } = mountPage()
    const [first, , third] = content.querySelectorAll('h2, h3')
    expect(first?.hasAttribute('id')).toBe(false)
    expect(third?.hasAttribute('id')).toBe(false)
    expect(result.current.headings.map((h) => h.id)).toEqual([
      'api-reference',
      'meter',
      'meter-2'
    ])
  })

  it('gives a heading its id when its link is followed', () => {
    const { content, result } = mountPage()
    act(() => result.current.onSelect(event, 'meter-2'))
    expect(content.querySelectorAll('h3')[1]?.id).toBe('meter-2')
    expect(window.location.hash).toBe('#meter-2')
  })

  it('follows headings the page replaces after collecting', async () => {
    const { content, result } = mountPage()
    content.innerHTML = '<h2>API reference</h2><h3>StatTile</h3>'
    await waitFor(() =>
      expect(result.current.headings.map((h) => h.id)).toEqual([
        'api-reference',
        'stattile'
      ])
    )
    act(() => result.current.onSelect(event, 'stattile'))
    expect(content.querySelector('h3')?.id).toBe('stattile')
  })

  it('follows a content wrapper that streaming replaces after collecting', async () => {
    const { content, result } = mountPage()
    const next = document.createElement('div')
    next.id = 'docs-content'
    next.innerHTML = '<h2>API reference</h2><h3>StatTile</h3>'
    content.replaceWith(next)
    await waitFor(() =>
      expect(result.current.headings.map((h) => h.id)).toEqual([
        'api-reference',
        'stattile'
      ])
    )
    act(() => result.current.onSelect(event, 'stattile'))
    expect(next.querySelector('h3')?.id).toBe('stattile')
  })

  it('lands a hash on a heading that has no id in the markup', () => {
    window.history.replaceState(null, '', '#meter-2')
    const { content } = mountPage()
    expect(content.querySelectorAll('h3')[1]?.id).toBe('meter-2')
    window.history.replaceState(null, '', '#')
  })

  it('leaves out headings inside a live example as it renders', async () => {
    const { content, result } = mountPage()
    const example = document.createElement('div')
    example.dataset.liveExample = 'rendered'
    example.innerHTML = '<h2>Demo heading</h2>'
    const before = result.current.headings
    content.append(example)
    // Each mutation collects afresh, so a new list shows it has looked.
    await waitFor(() => expect(result.current.headings).not.toBe(before))
    expect(result.current.headings.map((h) => h.id)).toEqual([
      'api-reference',
      'meter',
      'meter-2'
    ])
  })

  it('passes over a hidden heading when highlighting', async () => {
    const content = document.createElement('div')
    content.id = 'docs-content'
    content.innerHTML = '<h2>Above</h2><h2>Hidden</h2><h2>Below</h2>'
    document.body.append(content)
    const [above, hidden, below] = content.querySelectorAll('h2')
    // A display: none box reports a top of 0 and no client rects.
    const place = (el: Element, top: number, boxes = 1) => {
      el.getBoundingClientRect = () => ({ top }) as DOMRect
      el.getClientRects = () => ({ length: boxes }) as DOMRectList
    }
    place(above!, -100)
    place(hidden!, 0, 0)
    place(below!, 600)

    function Toc() {
      return <OnThisPage {...useDocHeadings()} />
    }
    const { getByRole } = render(<Toc />)

    await waitFor(() =>
      expect(
        getByRole('link', { name: 'Above' }).getAttribute('aria-current')
      ).toBe('location')
    )
  })
})
