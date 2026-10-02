import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Kbd } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const display = (element: Element) => getComputedStyle(element).display

describe('Kbd', () => {
  it('shows a keycap where the pointer can hover', () => {
    const { container } = render(<Kbd>/</Kbd>)
    expect(display(container.firstElementChild!)).toBe('inline-flex')
  })

  it('hides a keycap and a key group on a touch screen', () => {
    const { container } = render(
      <>
        <Kbd>/</Kbd>
        <Kbd keys={['mod', 'k']} />
        <Kbd emphasis='subtler'>Esc</Kbd>
      </>
    )
    setHoverCapable(false)
    for (const root of container.children) expect(display(root)).toBe('none')
  })

  it.each(['sm', 'md'] as const)(
    'gives every %s keycap in a group one height, glyph or word',
    (size) => {
      const { container } = render(
        <Kbd keys={['shift', 'enter', 'k', 'arrowup']} size={size} />
      )
      const heights = Array.from(
        container.querySelectorAll('[data-slot="kbd"]'),
        (cap) => cap.getBoundingClientRect().height
      )
      expect(new Set(heights).size).toBe(1)
      expect(heights[0]).toBe(size === 'sm' ? 20 : 24)
    }
  )

  it('draws glyphs at 12px', () => {
    const { container } = render(<Kbd>Enter</Kbd>)
    const svg = container.querySelector('svg')!.getBoundingClientRect()
    expect([svg.width, svg.height]).toEqual([12, 12])
  })
})
