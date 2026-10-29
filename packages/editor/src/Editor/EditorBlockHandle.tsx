'use client'

import { type RefObject, useEffect, useLayoutEffect, useState } from 'react'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { closeHistory } from '@tiptap/pm/history'
import { NodeSelection, type Transaction } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { createPortal } from 'react-dom'

import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'

import {
  canMoveBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  topBlockAt
} from './blockActions'
import { focusEditor } from './focusEditor'

// The grip's width and the gap to the text, in px.
const HANDLE_SIZE = 24
const HANDLE_GAP = 4

/**
 * A box of the handle's own in the editor's content wrapper, once Tiptap has
 * mounted its view there. A drag must start inside the wrapper, or UniqueID
 * reads the drop as a paste and gives the moved block a new id. Tiptap moves
 * the wrapper's children when it unmounts, so React never owns them directly.
 */
function useHandleHost(editor: TiptapEditor) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const box = document.createElement('div')
    box.dataset.slot = 'editor-block-handle-host'
    // As a grid item it would take a share of a tall wrapper from the text.
    box.style.display = 'contents'
    // Tiptap emits create just before it sets isInitialized.
    const mount = () => {
      editor.view.dom.parentElement?.append(box)
      setHost(box)
    }
    if (editor.isInitialized) mount()
    editor.on('create', mount)
    return () => {
      editor.off('create', mount)
      box.remove()
    }
  }, [editor])
  return host
}

// The block on the pointer's line, read just inside the text's start edge so
// the gutter beside it counts too.
function blockAtY(editor: TiptapEditor, clientY: number) {
  const { view } = editor
  const box = view.dom.getBoundingClientRect()
  const start = parseFloat(getComputedStyle(view.dom).paddingInlineStart) || 0
  const hit = view.posAtCoords({ left: box.left + start + 1, top: clientY })
  if (!hit) return null
  return topBlockAt(view.state, hit.inside >= 0 ? hit.inside : hit.pos)
}

// Centred on the block's first line, just before its start edge.
function placeAt(editor: TiptapEditor, wrapper: HTMLElement, pos: number) {
  const dom = editor.view.nodeDOM(pos)
  if (!(dom instanceof HTMLElement)) return null
  const box = dom.getBoundingClientRect()
  const frame = wrapper.getBoundingClientRect()
  const line = parseFloat(getComputedStyle(dom).lineHeight) || box.height
  return {
    top: box.top - frame.top + (Math.min(line, box.height) - HANDLE_SIZE) / 2,
    left: box.left - frame.left - HANDLE_SIZE - HANDLE_GAP
  }
}

type EditorBlockHandleProps = {
  editor: TiptapEditor
  /** Set while mounted, so Mod+/ opens the caret block's menu. */
  openMenuRef: RefObject<(() => void) | null>
}

/**
 * A grip beside the hovered block, or the caret's while the editor has focus.
 * Dragging it moves the block, and its menu moves, copies or deletes it.
 */
export function EditorBlockHandle({
  editor,
  openMenuRef
}: EditorBlockHandleProps) {
  const host = useHandleHost(editor)
  const wrapper = host?.parentElement ?? null
  const [hovered, setHovered] = useState<number | null>(null)
  const [menuAt, setMenuAt] = useState<number | null>(null)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const { caretBlock, doc } = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      caretBlock:
        current.isEditable && current.isFocused
          ? topBlockAt(current.state, current.state.selection.from)
          : null,
      doc: current.state.doc
    }),
    equalityFn: (a, b) => a.caretBlock === b?.caretBlock && a.doc === b?.doc
  })
  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEditable
  })
  const shown = menuAt ?? hovered ?? caretBlock

  useEffect(() => {
    if (!wrapper) return
    const onMove = (event: MouseEvent) =>
      setHovered(blockAtY(editor, event.clientY))
    const onLeave = () => setHovered(null)
    wrapper.addEventListener('mousemove', onMove)
    wrapper.addEventListener('mouseleave', onLeave)
    return () => {
      wrapper.removeEventListener('mousemove', onMove)
      wrapper.removeEventListener('mouseleave', onLeave)
    }
  }, [editor, wrapper])

  useEffect(() => {
    const follow = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return
      const map = (pos: number | null) => {
        if (pos == null) return pos
        const mapped = transaction.mapping.mapResult(pos)
        return mapped.deleted ? null : mapped.pos
      }
      setHovered(map)
      setMenuAt(map)
    }
    editor.on('transaction', follow)
    return () => {
      editor.off('transaction', follow)
    }
  }, [editor])

  useEffect(() => {
    openMenuRef.current = () => {
      const { from } = editor.state.selection
      setMenuAt(topBlockAt(editor.state, from))
    }
    return () => {
      openMenuRef.current = null
    }
  }, [editor, openMenuRef])

  // After every change, as text above or in the block moves it.
  useLayoutEffect(() => {
    setPlace(wrapper && shown != null ? placeAt(editor, wrapper, shown) : null)
  }, [editor, wrapper, shown, doc])

  if (!wrapper || !editable || shown == null || !place) return null

  const run = (action: (pos: number) => Transaction | null) => {
    const tr = action(shown)
    // Its own undo step, even straight after the last.
    if (tr) editor.view.dispatch(closeHistory(tr))
  }

  const onDragStart = (event: React.DragEvent) => {
    const { view } = editor
    const dom = view.nodeDOM(shown)
    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, shown))
    )
    const slice = view.state.selection.content()
    const { dom: html, text } = view.serializeForClipboard(slice)
    event.dataTransfer.clearData()
    event.dataTransfer.setData('text/html', html.innerHTML)
    event.dataTransfer.setData('text/plain', text)
    // Not copyMove: UniqueID would treat the drop as a copy and give new ids.
    event.dataTransfer.effectAllowed = 'move'
    if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 0)
    view.dragging = { slice, move: true }
  }

  return createPortal(
    <Menu
      open={menuAt !== null}
      onOpenChange={(open) => {
        if (!open) setMenuAt(null)
      }}
    >
      <Menu.Trigger
        render={
          <IconButton
            size='xs'
            emphasis='subtler'
            aria-label='Block actions'
            draggable
            // It shows only beside the caret's block, so focus on it would
            // hide it; Mod+/ is the keyboard path.
            tabIndex={-1}
            data-slot='editor-block-handle'
            className='absolute cursor-grab text-subtle'
            style={place}
            onClick={() => setMenuAt(shown)}
            onDragStart={onDragStart}
            onDragEnd={() => {
              editor.view.dragging = null
            }}
          >
            <DotsSixVerticalIcon weight='bold' className='size-4' aria-hidden />
          </IconButton>
        }
      />
      <Menu.Content
        side='bottom'
        align='start'
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        <Menu.Item
          icon={<ArrowUpIcon weight='bold' />}
          disabled={!canMoveBlock(doc, shown, -1)}
          onClick={() => run((pos) => moveBlock(editor.state, pos, -1))}
        >
          Move up
        </Menu.Item>
        <Menu.Item
          icon={<ArrowDownIcon weight='bold' />}
          disabled={!canMoveBlock(doc, shown, 1)}
          onClick={() => run((pos) => moveBlock(editor.state, pos, 1))}
        >
          Move down
        </Menu.Item>
        <Menu.Item
          icon={<CopySimpleIcon weight='bold' />}
          onClick={() => run((pos) => duplicateBlock(editor.state, pos))}
        >
          Duplicate
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item
          icon={<TrashIcon weight='bold' />}
          intent='danger'
          onClick={() => run((pos) => deleteBlock(editor.state, pos))}
        >
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>,
    host!
  )
}
