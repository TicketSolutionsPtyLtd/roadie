import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleRowClick } from './rowLink'

function setupRow({ external = false } = {}) {
  const row = document.createElement('div')
  document.body.appendChild(row)
  const link = document.createElement('a')
  link.href = external ? 'https://example.com/show' : '/shows/1'
  link.setAttribute('data-row-link', '')
  if (external) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  link.appendChild(document.createTextNode('Ball Park Music 1'))
  const cell = document.createElement('span')
  cell.textContent = 'Melbourne'
  const button = document.createElement('button')
  button.textContent = 'More actions'
  row.append(link, cell, button)
  row.addEventListener('click', (event) =>
    handleRowClick(event as MouseEvent, row)
  )
  row.addEventListener('auxclick', (event) =>
    handleRowClick(event as MouseEvent, row)
  )
  return { row, link, cell, button }
}

type MouseEventOptions = ConstructorParameters<typeof MouseEvent>[1] & {
  type?: string
}

function dispatch(
  target: Element,
  { type = 'click', ...init }: MouseEventOptions = {}
) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init }))
}

describe('handleRowClick', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    window.getSelection()?.removeAllRanges()
  })

  it('follows a plain click from anywhere on the row', () => {
    const { cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    dispatch(cell, { button: 0 })
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('opens a new tab on Cmd/Ctrl click, without clicking the link', () => {
    const { cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { button: 0, metaKey: true })
    expect(open).toHaveBeenCalledWith(link.href, '_blank', 'noopener')
    expect(click).not.toHaveBeenCalled()
  })

  it('treats Shift-click like Cmd/Ctrl', () => {
    const { cell } = setupRow()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { button: 0, shiftKey: true })
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('opens a new tab on middle click', () => {
    const { cell } = setupRow()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { type: 'auxclick', button: 1 })
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('does nothing on right click', () => {
    const { cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { button: 2 })
    expect(click).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('does nothing for browser back/forward buttons', () => {
    const { cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    dispatch(cell, { button: 3 })
    dispatch(cell, { button: 4 })
    expect(click).not.toHaveBeenCalled()
  })

  it('uses noopener,noreferrer for an external link', () => {
    const { cell, link } = setupRow({ external: true })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { button: 0, metaKey: true })
    expect(open).toHaveBeenCalledWith(
      link.href,
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('opens exactly one tab for a plain click on an external link', () => {
    const { cell, link } = setupRow({ external: true })
    const click = vi.spyOn(link, 'click')
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    dispatch(cell, { button: 0 })
    expect(click).toHaveBeenCalledTimes(1)
    expect(open).not.toHaveBeenCalled()
  })

  it('leaves an interactive control inside the row to itself', () => {
    const { button, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    dispatch(button, { button: 0 })
    expect(click).not.toHaveBeenCalled()
  })

  it('ignores a click whose real target sits outside the row (a portalled menu item)', () => {
    const { row, link } = setupRow()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const click = vi.spyOn(link, 'click')
    // React bubbles a portalled click through the component tree, but the
    // native event's target is never inside the row's real DOM.
    const event = new MouseEvent('click', { bubbles: true, button: 0 })
    Object.defineProperty(event, 'target', { value: outside })
    handleRowClick(event, row)
    expect(click).not.toHaveBeenCalled()
  })

  it('ignores a click ending a text selection inside the row', () => {
    const { row, cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    // jsdom's Selection/Range containsNode is unreliable, so the row/selection
    // relationship this branch cares about is stubbed directly.
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      containsNode: (node: Node) => node === row
    } as unknown as Selection)
    dispatch(cell, { button: 0 })
    expect(click).not.toHaveBeenCalled()
  })

  it('ignores a text selection elsewhere on the page', () => {
    const { cell, link } = setupRow()
    const click = vi.spyOn(link, 'click')
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      containsNode: () => false
    } as unknown as Selection)
    dispatch(cell, { button: 0 })
    expect(click).toHaveBeenCalledTimes(1)
  })
})
