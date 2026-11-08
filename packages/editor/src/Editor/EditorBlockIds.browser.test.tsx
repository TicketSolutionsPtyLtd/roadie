import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'
import { LINE_START, clickIntoEditor } from './testUtils'

const LABEL = 'Page'

const text = (value: string) => ({ type: 'text', text: value })

const valueOf = (...content: object[]): EditorValue => ({
  version: 1,
  preset: 'blocks',
  doc: { type: 'doc', content: content as JSONContent[] }
})

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(textbox)
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

  it('gives a controlled value’s blocks ids, reporting them', async () => {
    const onValueChange = vi.fn()
    const page = (value: EditorValue) => (
      <Editor aria-label={LABEL} value={value} onValueChange={onValueChange} />
    )
    const { rerender } = render(
      page(
        valueOf({
          type: 'paragraph',
          attrs: { blockId: 'doors' },
          content: [text('Doors 7pm')]
        })
      )
    )
    await screen.findByText('Doors 7pm')

    rerender(page(valueOf({ type: 'paragraph', content: [text('All ages')] })))

    await waitFor(() =>
      expect(lastDoc(onValueChange).content).toEqual([
        {
          type: 'paragraph',
          attrs: { blockId: expect.any(String) },
          content: [text('All ages')]
        }
      ])
    )
  })

  it('reports a controlled value’s new ids once, though the value keeps none', async () => {
    const onValueChange = vi.fn()
    const value = valueOf({ type: 'paragraph', content: [text('Doors 7pm')] })
    function Page() {
      const [, setReported] = useState<EditorValue>()
      return (
        <Editor
          aria-label={LABEL}
          value={value}
          onValueChange={(next) => {
            onValueChange(next)
            setReported(next)
          }}
        />
      )
    }
    render(<Page />)
    await screen.findByText('Doors 7pm')
    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    const reported = onValueChange.mock.calls.length

    await focusedTextbox()

    expect(onValueChange).toHaveBeenCalledTimes(reported)
  })

  it('sets a controlled value that changes only its ids', async () => {
    const page = (blockId: string) => (
      <Editor
        aria-label={LABEL}
        value={valueOf({
          type: 'paragraph',
          attrs: { blockId },
          content: [text('Doors 7pm')]
        })}
      />
    )
    const { rerender } = render(page('doors'))
    const doors = await screen.findByText('Doors 7pm')
    expect(doors.closest('[data-blockid]')).toHaveAttribute(
      'data-blockid',
      'doors'
    )

    rerender(page('gates'))

    await waitFor(() =>
      expect(
        screen.getByText('Doors 7pm').closest('[data-blockid]')
      ).toHaveAttribute('data-blockid', 'gates')
    )
  })

  it('sets a controlled value that adds a block without an id', async () => {
    const page = (...content: object[]) => (
      <Editor aria-label={LABEL} value={valueOf(...content)} />
    )
    const doors = { type: 'paragraph', content: [text('Doors 7pm')] }
    const { rerender } = render(page(doors))
    await screen.findByText('Doors 7pm')

    rerender(page(doors, { type: 'paragraph', content: [text('All ages')] }))

    expect(await screen.findByText('All ages')).toBeInTheDocument()
  })

  it('reports nothing as a rich controlled value is set', async () => {
    const onValueChange = vi.fn()
    const page = (value: EditorValue) => (
      <Editor aria-label={LABEL} value={value} onValueChange={onValueChange} />
    )
    const { rerender } = render(
      page({
        ...valueOf({ type: 'paragraph', content: [text('Doors 7pm')] }),
        preset: 'rich'
      })
    )
    await screen.findByText('Doors 7pm')

    rerender(
      page({
        ...valueOf(
          { type: 'paragraph', content: [text('All ages')] },
          { type: 'horizontalRule' }
        ),
        preset: 'rich'
      })
    )

    await screen.findByText('All ages')
    expect(onValueChange).not.toHaveBeenCalled()
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

describe('Editor blocks preset ids on drag', () => {
  const crowdImage = {
    type: 'image',
    attrs: { blockId: 'crowd', src: '/images/crowd.webp', alt: 'Crowd' }
  }
  const doorsParagraph = {
    type: 'paragraph',
    attrs: { blockId: 'doors' },
    content: [text('Doors 7pm')]
  }

  async function dragImageAfterDoors(
    init: DragEventInit = {},
    dropInit = init
  ) {
    const image = await screen.findByRole('img', { name: 'Crowd' })
    dragBlock(
      image.closest('[draggable="true"]')!,
      await screen.findByText('Doors 7pm'),
      init,
      dropInit
    )
  }

  it('keeps a block’s id as it is dragged to a new place', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(crowdImage, doorsParagraph)}
        onValueChange={onValueChange}
      />
    )

    await dragImageAfterDoors()

    await waitFor(() =>
      expect(lastDoc(onValueChange).content?.[1]?.type).toBe('image')
    )
    expect(blockIds(lastDoc(onValueChange)).slice(0, 2)).toEqual([
      'doors',
      'crowd'
    ])
  })

  it('gives a block copied by a modifier pressed mid-drag an id of its own', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(crowdImage, doorsParagraph)}
        onValueChange={onValueChange}
      />
    )

    await dragImageAfterDoors({}, { altKey: true, ctrlKey: true })

    await waitFor(() =>
      expect(lastDoc(onValueChange).content?.length).toBeGreaterThan(2)
    )
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids.slice(0, 2)).toEqual(['crowd', 'doors'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives text dragged out of its block a block id of its own', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(doorsParagraph, crowdImage)}
        onValueChange={onValueChange}
      />
    )
    const doors = await screen.findByText('Doors 7pm')
    const crowd = await screen.findByRole('img', { name: 'Crowd' })
    // A loaded WebKit lays the failed image out late, with no size to drop
    // on till then.
    await expect
      .poll(() => crowd.getBoundingClientRect().height, { timeout: 5000 })
      .toBeGreaterThan(0)
    await clickIntoEditor(doors)
    await userEvent.keyboard(`${LINE_START}{Shift>}{ArrowRight>6/}{/Shift}`)

    dragBlock(doors, crowd, {})

    // WebKit drops it before the image, the others after it.
    const draggedOf = (doc: JSONContent) =>
      doc.content?.find(
        (node, i) => i > 0 && node.content?.[0]?.text === 'Doors '
      )
    await waitFor(() => expect(draggedOf(lastDoc(onValueChange))).toBeDefined())
    const [left] = lastDoc(onValueChange).content!
    const dragged = draggedOf(lastDoc(onValueChange))
    expect(dragged?.content).toEqual([text('Doors ')])
    expect(left).toEqual({
      type: 'paragraph',
      attrs: { blockId: 'doors' },
      content: [text('7pm')]
    })
    expect(dragged?.attrs?.blockId).toEqual(expect.any(String))
    expect(dragged?.attrs?.blockId).not.toBe('doors')
  })

  it('keeps the ids of blocks dragged to a new place together', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(
          doorsParagraph,
          {
            type: 'paragraph',
            attrs: { blockId: 'ages' },
            content: [text('All ages')]
          },
          {
            type: 'paragraph',
            attrs: { blockId: 'lineup' },
            content: [text('Lineup')]
          }
        )}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()
    const doors = await screen.findByText('Doors 7pm')
    await userEvent.click(doors)
    await userEvent.keyboard(`${LINE_START}{Shift>}{ArrowRight>18/}{/Shift}`)

    dragBlock(doors, await screen.findByText('Lineup'), {})

    await waitFor(() =>
      expect(lastDoc(onValueChange).content?.at(-1)?.content).toEqual([
        text('All ages')
      ])
    )
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids).toEqual(['doors', 'lineup', 'ages'])
  })

  it('gives blocks copied by dragging ids of their own', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(doorsParagraph, {
          type: 'paragraph',
          attrs: { blockId: 'ages' },
          content: [text('All ages')]
        })}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')

    dragBlock(
      await screen.findByText('Doors 7pm'),
      await screen.findByText('All ages'),
      { altKey: true, ctrlKey: true }
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange).content?.length).toBeGreaterThan(2)
    )
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids).toEqual(expect.arrayContaining(['doors', 'ages']))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives the blocks inside a copied list ids of their own', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(
          {
            type: 'bulletList',
            attrs: { blockId: 'list' },
            content: [
              {
                type: 'listItem',
                attrs: { blockId: 'item' },
                content: [
                  {
                    type: 'paragraph',
                    attrs: { blockId: 'point' },
                    content: [text('Doors 7pm')]
                  }
                ]
              }
            ]
          },
          {
            type: 'paragraph',
            attrs: { blockId: 'ages' },
            content: [text('All ages')]
          }
        )}
        onValueChange={onValueChange}
      />
    )
    await focusedTextbox()
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')

    dragBlock(
      await screen.findByText('Doors 7pm'),
      await screen.findByText('All ages'),
      { altKey: true, ctrlKey: true }
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange).content?.length).toBeGreaterThan(2)
    )
    const ids = blockIds(lastDoc(onValueChange))
    expect(ids.slice(0, 4)).toEqual(['list', 'item', 'point', 'ages'])
    expect(ids.length).toBeGreaterThan(4)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// A real drag keeps the effectAllowed ProseMirror sets on dragstart until the
// drop, but a DataTransfer made in a test stays at 'none', so this keeps it.
function dragBlock(
  source: Element,
  target: Element,
  init: DragEventInit,
  dropInit = init
) {
  const dataTransfer = new DataTransfer()
  let effectAllowed = dataTransfer.effectAllowed
  Object.defineProperty(dataTransfer, 'effectAllowed', {
    get: () => effectAllowed,
    set: (value: DataTransfer['effectAllowed']) => {
      effectAllowed = value
    }
  })
  const from = source.getBoundingClientRect()
  source.dispatchEvent(
    new DragEvent('dragstart', {
      ...init,
      dataTransfer,
      bubbles: true,
      clientX: from.left + from.width / 2,
      clientY: from.top + from.height / 2
    })
  )
  const to = target.getBoundingClientRect()
  target.dispatchEvent(
    new DragEvent('drop', {
      ...dropInit,
      dataTransfer,
      bubbles: true,
      cancelable: true,
      clientX: to.right - 1,
      clientY: to.bottom - 1
    })
  )
}
