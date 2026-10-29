import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Page'

const text = (value: string) => ({ type: 'text', text: value })

const valueOf = (...content: object[]): EditorValue => ({
  version: 1,
  preset: 'blocks',
  doc: { type: 'doc', content: content as JSONContent[] }
})

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc

const blockIds = (doc: JSONContent): unknown[] =>
  (doc.content ?? []).flatMap((node) => [
    ...(node.type === 'text' ? [] : [node.attrs?.blockId]),
    ...blockIds(node)
  ])

describe('Editor blocks preset ids', () => {
  it('gives a loaded block without an id one, reporting it', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf({
          type: 'paragraph',
          content: [text('Doors 7pm')]
        })}
        onValueChange={onValueChange}
      />
    )

    await waitFor(() =>
      expect(blockIds(lastDoc(onValueChange))).toEqual([expect.any(String)])
    )
  })

  it('keeps a block’s id as its text is edited', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf({
          type: 'paragraph',
          attrs: { blockId: 'doors' },
          content: [text('Doors 7pm')]
        })}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()

    await userEvent.keyboard(' sharp')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content).toEqual([
        {
          type: 'paragraph',
          attrs: { blockId: 'doors' },
          content: [text('Doors 7pm sharp')]
        }
      ])
    )
  })

  it('gives a block split with Enter an id of its own', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()

    await userEvent.keyboard('Doors 7pm{Enter}All ages')

    await waitFor(() => expect(lastDoc(onValueChange).content).toHaveLength(2))
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids).toEqual([expect.any(String), expect.any(String)])
    expect(new Set(ids).size).toBe(2)
  })

  it('gives pasted blocks new ids, even ones copied from this page', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf({
          type: 'paragraph',
          attrs: { blockId: 'kept' },
          content: [text('Doors 7pm')]
        })}
        onValueChange={onValueChange}
      />
    )
    const textbox = await focusedTextbox()
    const clipboardData = new DataTransfer()
    clipboardData.setData(
      'text/html',
      '<p data-blockid="kept">All ages</p><h2 data-blockid="kept">Lineup</h2>'
    )
    const paste = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true
    })
    Object.defineProperty(paste, 'clipboardData', { value: clipboardData })
    textbox.dispatchEvent(paste)

    await waitFor(() => expect(textbox).toHaveTextContent('Lineup'))
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids).toContain('kept')
    expect(ids.every((id) => typeof id === 'string')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
