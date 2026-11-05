import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'

import { Editor } from '.'
import { type EditorValue } from '../schema'
import { clickIntoEditor } from './testUtils'

const LABEL = 'Event description'

const soldOut: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Sold out' }] }
    ]
  }
}

// Linux WebKit reads selection moves late. Holding back selectionchange
// stands in for that, so the race doesn't depend on the browser's timing.
function holdSelectionReads() {
  const hold = (event: Event) => event.stopImmediatePropagation()
  window.addEventListener('selectionchange', hold, { capture: true })
  return () =>
    window.removeEventListener('selectionchange', hold, { capture: true })
}

it('clickIntoEditor resolves only once the focus sync can no longer undo a caret move', async () => {
  render(<Editor aria-label={LABEL} defaultValue={soldOut} />)
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  const paragraph = within(textbox).getByText('Sold out')
  let syncDone: Promise<void> | undefined
  textbox.addEventListener(
    'focus',
    () => {
      // Ordered after ProseMirror's 20ms focus timer, as in clickIntoEditor.
      // eslint-disable-next-line roadie/no-fixed-sleep
      syncDone = new Promise((resolve) => setTimeout(resolve, 20))
    },
    { once: true }
  )

  await clickIntoEditor(paragraph)
  const release = holdSelectionReads()
  const text = paragraph.firstChild as Text
  // The click lands mid-block, past the text, so the sync would undo this.
  document.getSelection()?.collapse(text, 0)
  await syncDone
  release()

  expect(document.getSelection()?.focusNode).toBe(text)
  expect(document.getSelection()?.focusOffset).toBe(0)
})
