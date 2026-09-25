// @vitest-environment jsdom
import type { MouseEvent } from 'react'

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useDocHeadings } from './OnThisPage'

vi.mock('next/navigation', () => ({ usePathname: () => '/charts/meter' }))

beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
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
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(result.current.headings.map((h) => h.id)).toEqual([
      'api-reference',
      'stattile'
    ])
    act(() => result.current.onSelect(event, 'stattile'))
    expect(content.querySelector('h3')?.id).toBe('stattile')
  })
})
