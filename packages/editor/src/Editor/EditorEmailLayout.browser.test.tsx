import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

describe('Editor page image', () => {
  it.each([
    [{ fullWidth: true }, 'across'],
    [{ align: 'center' }, 'centre'],
    [{ align: 'right' }, 'end']
  ] as const)(
    'draws %j %s the text, with its caption under it',
    async (look, at) => {
      render(
        <div style={{ width: 600 }}>
          <Editor
            aria-label={LABEL}
            defaultValue={{
              version: 1,
              preset: 'blocks',
              doc: {
                type: 'doc',
                content: [
                  {
                    type: 'image',
                    attrs: {
                      src: '/images/crowd.webp',
                      alt: 'Crowd',
                      caption: 'Gates 11am',
                      ...look
                    }
                  }
                ]
              }
            }}
          />
        </div>
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      const figure = textbox.querySelector<HTMLElement>(
        '[data-slot="editor-image"]'
      )!
      // The tests serve no images, so this stands in for a loaded one's size.
      const img = figure.querySelector('img')!
      if (at !== 'across') img.style.width = '120px'
      const box = boxOf(figure)
      const style = getComputedStyle(textbox)
      const start = boxOf(textbox).left + parseFloat(style.paddingLeft)
      const end = boxOf(textbox).right - parseFloat(style.paddingRight)

      expect(await screen.findByText('Gates 11am')).toBeVisible()
      const place = {
        across: box.width - (end - start),
        centre: (box.left + box.right) / 2 - (start + end) / 2,
        end: box.right - end
      }
      expect(place[at]).toBeCloseTo(0, 0)
    }
  )

  it('centres a fitted image, not its long caption', async () => {
    render(
      <div style={{ width: 600 }}>
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset: 'blocks',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'image',
                  attrs: {
                    src: '/images/crowd.webp',
                    alt: 'Crowd',
                    align: 'center',
                    caption:
                      'The crowd at sunset on the second night, from the hill behind the main stage, as the headliner came on'
                  }
                }
              ]
            }
          }}
        />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const img = textbox.querySelector<HTMLElement>(
      '[data-slot="editor-image"] img'
    )!
    // The tests serve no images, so this stands in for a loaded one's size.
    img.style.width = '120px'
    const style = getComputedStyle(textbox)
    const start = boxOf(textbox).left + parseFloat(style.paddingLeft)
    const end = boxOf(textbox).right - parseFloat(style.paddingRight)
    const box = boxOf(img)

    expect((box.left + box.right) / 2).toBeCloseTo((start + end) / 2, 0)
  })
})

describe('Editor gap cursor', () => {
  it('draws the place between an image and a section as a line across the text', async () => {
    const textbox = await renderEmail([
      { type: 'image', attrs: { src: POSTER, alt: 'Crowd', width: null } },
      { type: 'section', content: [p('Gates 11am')] }
    ])
    await userEvent.click(await screen.findByText('Gates 11am'))
    await userEvent.keyboard('{Home}{ArrowUp}')

    const gap = await waitFor(() => {
      const found = textbox.querySelector('.ProseMirror-gapcursor')
      expect(found).not.toBe(null)
      return found!
    })
    const line = getComputedStyle(gap, '::after')
    const style = getComputedStyle(textbox)
    const text =
      boxOf(textbox).width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)

    expect(parseFloat(line.width)).toBeGreaterThan(text / 2)
    expect(parseFloat(line.borderTopWidth)).toBe(2)
  })
})

describe('Editor gap cursor after an image', () => {
  it('draws its line in the gap below the image, not over it', async () => {
    const textbox = await renderEmail([
      { type: 'image', attrs: { src: POSTER, alt: 'Crowd', width: null } },
      { type: 'section', content: [p('Gates 11am')] }
    ])
    await userEvent.click(await screen.findByText('Gates 11am'))
    await userEvent.keyboard('{Home}{ArrowUp}')

    const gap = await waitFor(() => {
      const found = textbox.querySelector('.ProseMirror-gapcursor')
      expect(found).not.toBe(null)
      return found!
    })
    const image = boxOf(textbox.querySelector('img')!)
    const section = boxOf(textbox.querySelector('[data-type="section"]')!)
    // The line is the gap's ::after, placed from the gap's own box.
    const top =
      boxOf(gap).top + parseFloat(getComputedStyle(gap, '::after').top)

    expect(top).toBeGreaterThanOrEqual(image.bottom)
    expect(top + 2).toBeLessThanOrEqual(section.top)
  })
})

describe('Editor gap cursor in a column', () => {
  it('keeps the line within its column', async () => {
    const textbox = await renderEmail([
      {
        type: 'columns',
        content: [
          {
            type: 'column',
            content: [
              {
                type: 'image',
                attrs: { src: POSTER, alt: 'Crowd', width: null }
              },
              p('Gates 11am')
            ]
          },
          { type: 'column', content: [p('Tickets')] }
        ]
      }
    ])
    await userEvent.click(await screen.findByText('Gates 11am'))
    await userEvent.keyboard('{Home}{ArrowUp}{ArrowUp}')

    const gap = await waitFor(() => {
      const found = textbox.querySelector('.ProseMirror-gapcursor')
      expect(found).not.toBe(null)
      return found!
    })
    const column = boxOf(gap.closest('[data-type="column"]')!)
    const line = boxOf(gap)

    expect(line.left).toBeGreaterThanOrEqual(column.left - 1)
    expect(line.right).toBeLessThanOrEqual(column.right + 1)
  })
})
