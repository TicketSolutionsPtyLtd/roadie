import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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

  it('keeps a long word inside a stacked column', async () => {
    const link =
      'https://www.oztix.com.au/ochre-kite-weekender-tickets-and-camping'
    const longWord: EditorValue = {
      ...twoColumns,
      doc: {
        type: 'doc',
        content: [
          { type: 'columns', content: [column(link), column('All ages')] }
        ]
      }
    }
    render(
      <div style={{ width: 375 }}>
        <Editor aria-label={LABEL} defaultValue={longWord} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText(link)
    const [first] = textbox.querySelectorAll('[data-type="column"]')
    expect(first!.getBoundingClientRect().right).toBeLessThanOrEqual(
      textbox.getBoundingClientRect().right
    )
  })

  it('runs a line to the canvas’s full width at any size', async () => {
    const line =
      'Gates open at 11am with food trucks, a kids’ zone and a silent disco running until the headliners take the main stage at 9pm.'
    render(
      <div style={{ width: 900 }}>
        <Editor
          aria-label={LABEL}
          size='sm'
          defaultValue={{
            ...twoColumns,
            doc: { type: 'doc', content: [p(line)] }
          }}
        />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const paragraph = await screen.findByText(line)
    const { paddingLeft, paddingRight } = getComputedStyle(textbox)
    expect(paragraph.getBoundingClientRect().width).toBeCloseTo(
      textbox.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight),
      0
    )
  })

  it('outlines sections, columns and spacers, drawing a spacer at its height', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          ...twoColumns,
          doc: {
            type: 'doc',
            content: [
              { type: 'section', content: [p('Gates 11am')] },
              twoColumns.doc.content![0]!,
              { type: 'spacer', attrs: { height: 48 } }
            ]
          }
        }}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText('Gates 11am')
    for (const type of ['section', 'column', 'spacer']) {
      const element = textbox.querySelector(`[data-type="${type}"]`)!
      expect(getComputedStyle(element).borderTopStyle, type).toBe('dashed')
    }
    const spacer = textbox.querySelector('[data-type="spacer"]')!
    expect(spacer.getBoundingClientRect().height).toBe(48)
  })
})
