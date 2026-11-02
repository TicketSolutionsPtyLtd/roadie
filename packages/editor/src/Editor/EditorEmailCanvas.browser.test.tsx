import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Newsletter'

const p = (text: string): JSONContent => ({
  type: 'paragraph',
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
  document.body.innerHTML = ''
})

describe('Editor email canvas', () => {
  const twoColumns: EditorValue = {
    version: 1,
    preset: 'email',
    doc: {
      type: 'doc',
      content: [
        { type: 'columns', content: [column('Doors 7pm'), column('All ages')] }
      ]
    }
  }

  async function columnBoxes(width: number) {
    render(
      <div style={{ width }}>
        <Editor aria-label={LABEL} defaultValue={twoColumns} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText('Doors 7pm')
    const boxes = [...textbox.querySelectorAll('[data-type="column"]')].map(
      (element) => element.getBoundingClientRect()
    )
    return { textbox: textbox.getBoundingClientRect(), boxes }
  }

  it('is at most 600px wide, centred in a wider editor', async () => {
    const { textbox: canvas } = await columnBoxes(900)
    expect(canvas.width).toBe(600)
    const editor = screen
      .getByRole('textbox', { name: LABEL })
      .closest('[data-slot="editor"]')!
      .getBoundingClientRect()
    expect(canvas.left - editor.left).toBeCloseTo(
      editor.right - canvas.right,
      0
    )
  })

  it('puts columns side by side at email width', async () => {
    const { boxes } = await columnBoxes(900)
    expect(boxes[0]!.top).toBe(boxes[1]!.top)
    expect(boxes[0]!.width).toBeCloseTo(boxes[1]!.width, 0)
  })

  it('stacks columns at phone width', async () => {
    const { boxes } = await columnBoxes(375)
    expect(boxes[1]!.top).toBeGreaterThan(boxes[0]!.bottom)
  })

  describe('spacing', () => {
    const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'
    const card: EditorValue = {
      version: 1,
      preset: 'email',
      doc: {
        type: 'doc',
        content: [
          p('Two weeks to go'),
          {
            type: 'section',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Ochre Kite Weekender' }]
              },
              p('Gates 11am, all ages.'),
              {
                type: 'button',
                attrs: { href: TICKETS },
                content: [{ type: 'text', text: 'Get tickets' }]
              }
            ]
          }
        ]
      }
    }

    async function renderCard() {
      render(<Editor aria-label={LABEL} defaultValue={card} />)
      await screen.findByText('Get tickets')
      const box = (text: string) =>
        screen
          .getByText(text)
          .closest<HTMLElement>('h2, p, [data-type="button"]')!
          .getBoundingClientRect()
      const section = screen
        .getByText('Gates 11am, all ages.')
        .closest<HTMLElement>('[data-type="section"]')!
      return { box, section }
    }

    it('puts 16px between blocks, whatever they are, as the email does', async () => {
      const { box } = await renderCard()
      const heading = box('Ochre Kite Weekender')
      const text = box('Gates 11am, all ages.')
      const button = box('Get tickets')
      expect(text.top - heading.bottom).toBeCloseTo(16, 0)
      expect(button.top - text.bottom).toBeCloseTo(16, 0)
    })

    it('pads a section 16px above and below, and not at its sides', async () => {
      const { box, section } = await renderCard()
      const edges = section.getBoundingClientRect()
      expect(box('Ochre Kite Weekender').top - edges.top).toBeCloseTo(16, 0)
      expect(edges.bottom - box('Get tickets').bottom).toBeCloseTo(16, 0)
      expect(box('Gates 11am, all ages.').left).toBeCloseTo(edges.left, 0)
    })

    it('outlines a section only under the pointer, outside its box', async () => {
      const { section } = await renderCard()
      const resting = getComputedStyle(section)
      expect(resting.outlineColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      expect(resting.borderTopWidth).toBe('0px')

      await userEvent.hover(section)

      await expect
        .poll(() => getComputedStyle(section).outlineColor)
        .not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      expect(getComputedStyle(section).outlineStyle).toBe('dashed')
    })
  })
})
