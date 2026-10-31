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
})
