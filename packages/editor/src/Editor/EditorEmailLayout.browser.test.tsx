import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { JSONContent } from '../schema'

const LABEL = 'Newsletter'

// A host that never resolves, as the layout doesn't wait on the image.
const POSTER = 'https://example.test/poster.webp'

const p = (text: string, attrs?: Record<string, unknown>): JSONContent => ({
  type: 'paragraph',
  ...(attrs && { attrs }),
  content: [{ type: 'text', text }]
})

const column = (text: string): JSONContent => ({
  type: 'column',
  content: [p(text)]
})

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

async function renderEmail(content: JSONContent[], width = 600) {
  render(
    <div style={{ width }}>
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: { type: 'doc', content }
        }}
      />
    </div>
  )
  return screen.findByRole('textbox', { name: LABEL })
}

const boxOf = (element: Element) => element.getBoundingClientRect()

describe('Editor email layout', () => {
  it.each([
    ['wide-left', 2],
    ['wide-right', 0.5]
  ] as const)(
    'splits a %s row of two columns %s to 1',
    async (layout, ratio) => {
      const textbox = await renderEmail([
        {
          type: 'columns',
          attrs: { layout },
          content: [column('Lineup'), column('Tickets')]
        }
      ])
      await screen.findByText('Lineup')

      const [first, second] = [
        ...textbox.querySelectorAll('[data-type="column"]')
      ].map(boxOf)

      expect(first!.width / second!.width).toBeCloseTo(ratio, 1)
      expect(first!.top).toBe(second!.top)
    }
  )

  it('keeps the wide column twice the others as columns are added', async () => {
    const textbox = await renderEmail([
      {
        type: 'columns',
        attrs: { layout: 'wide-right' },
        content: [column('Lineup'), column('Tickets')]
      }
    ])
    await userEvent.click(await screen.findByText('Lineup'))

    await userEvent.click(
      await screen.findByRole('button', { name: 'Columns: 2 columns' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: '3 columns' })
    )

    await expect
      .poll(() => textbox.querySelectorAll('[data-type="column"]').length)
      .toBe(3)
    const widths = [...textbox.querySelectorAll('[data-type="column"]')].map(
      (element) => boxOf(element).width
    )
    expect(widths[2]! / widths[0]!).toBeCloseTo(2, 1)
    expect(widths[1]! / widths[0]!).toBeCloseTo(1, 1)
  })

  it('stacks a reversed row last column first on a phone, in order wider', async () => {
    const row: JSONContent = {
      type: 'columns',
      attrs: { stack: 'reverse' },
      content: [column('Poster'), column('Details')]
    }
    const narrow = await renderEmail([row], 360)
    const poster = boxOf(await screen.findByText('Poster'))
    const details = boxOf(await screen.findByText('Details'))
    expect(details.top).toBeLessThan(poster.top)
    cleanup()
    narrow.remove()

    await renderEmail([row], 600)
    const wide = {
      poster: boxOf(await screen.findByText('Poster')),
      details: boxOf(await screen.findByText('Details'))
    }
    expect(wide.poster.left).toBeLessThan(wide.details.left)
    expect(wide.poster.top).toBe(wide.details.top)
  })

  it('centres a centred paragraph', async () => {
    await renderEmail([p('Gates 11am', { align: 'center' }), p('All ages')])

    expect(
      getComputedStyle(await screen.findByText('Gates 11am')).textAlign
    ).toBe('center')
    expect(
      getComputedStyle(await screen.findByText('All ages')).textAlign
    ).not.toBe('center')
  })

  it.each([
    [undefined, 'centre'],
    ['left', 'start'],
    ['right', 'end']
  ] as const)(
    'fills the column without a width, or sits at its width at the %s',
    async (align, at) => {
      const image = (attrs: Record<string, unknown>): JSONContent => ({
        type: 'image',
        attrs: { src: POSTER, alt: 'Crowd', ...attrs }
      })
      const textbox = await renderEmail([
        image({ width: null }),
        image({ width: 120, ...(align && { align }) })
      ])
      const [full, fit] = [
        ...textbox.querySelectorAll('[data-slot="editor-image"]')
      ].map(boxOf)
      const canvas = boxOf(textbox)
      const style = getComputedStyle(textbox)
      const start = canvas.left + parseFloat(style.paddingLeft)
      const end = canvas.right - parseFloat(style.paddingRight)

      expect(full!.width).toBeCloseTo(end - start, 0)
      expect(fit!.width).toBeCloseTo(120, 0)
      const place = {
        start: fit!.left - start,
        centre: (fit!.left + fit!.right) / 2 - (start + end) / 2,
        end: end - fit!.right
      }
      expect(place[at]).toBeCloseTo(0, 0)
    }
  )
})
