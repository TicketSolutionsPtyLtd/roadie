'use client'

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  PlusIcon,
  SelectionPlusIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { closeHistory } from '@tiptap/pm/history'
import { Fragment, Slice } from '@tiptap/pm/model'
import {
  NodeSelection,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { createPortal } from 'react-dom'

import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'

import {
  type BlockContainers,
  blockAt,
  canMoveBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  parentBlock
} from './blockActions'
import { draggedBlocks } from './blockDrag'
import { focusEditor } from './focusEditor'

// A button's width and the gap to the text, in px.
const HANDLE_SIZE = 24
const HANDLE_GAP = 4
const GUTTER = HANDLE_SIZE * 2 + HANDLE_GAP

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

// The block under the pointer, read inside the text's edges so the gutter
// beside a top-level block counts too.
function blockAtPointer(
  editor: TiptapEditor,
  event: MouseEvent,
  containers: BlockContainers
) {
  const { view } = editor
  const box = view.dom.getBoundingClientRect()
  const style = getComputedStyle(view.dom)
  const start = box.left + (parseFloat(style.paddingInlineStart) || 0) + 1
  const end = box.right - (parseFloat(style.paddingInlineEnd) || 0) - 1
  const left = Math.min(Math.max(event.clientX, start), end)
  const hit = view.posAtCoords({ left, top: event.clientY })
  if (!hit) return null
  return blockAt(view.state, hit.inside >= 0 ? hit.inside : hit.pos, containers)
}

// The gutter between a nested block and its handle crosses its container's
// padding, which would otherwise hand the handle to the container.
function inGutterOf(editor: TiptapEditor, pos: number, event: MouseEvent) {
  const dom = editor.view.nodeDOM(pos)
  if (!(dom instanceof HTMLElement)) return false
  const box = dom.getBoundingClientRect()
  return (
    event.clientY >= box.top &&
    event.clientY <= box.bottom &&
    event.clientX < box.left &&
    event.clientX >= box.left - GUTTER
  )
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

/**
 * Opens the insert menu after the block at `pos`, on a new line, or on the
 * block itself when it's an empty line, by typing the `/` that opens it.
 */
function addAfter(editor: TiptapEditor, pos: number) {
  const { state } = editor
  const node = state.doc.nodeAt(pos)
  if (!node) return
  const emptyLine = node.type.name === 'paragraph' && node.content.size === 0
  const { paragraph } = state.schema.nodes
  const tr = emptyLine
    ? state.tr.insertText('/', pos + 1)
    : state.tr.insert(
        pos + node.nodeSize,
        paragraph!.create(null, state.schema.text('/'))
      )
  const caret = emptyLine ? pos + 2 : pos + node.nodeSize + 2
  editor.view.dispatch(
    closeHistory(tr.setSelection(TextSelection.create(tr.doc, caret)))
  )
  focusEditor(editor)
}

const PARENT_LABELS: Record<string, string> = {
  section: 'Select section',
  columns: 'Select columns'
}

type EditorBlockHandleProps = {
  editor: TiptapEditor
  /** Set while mounted, so Mod+/ opens the caret block's menu. */
  openMenuRef: RefObject<(() => void) | null>
  /** The nodes whose children each get a handle. */
  containers: BlockContainers
  /** Shows an add button that opens the insert menu after the block. */
  canAdd?: boolean
}

/**
 * A grip beside the hovered block, or the caret's while the editor has focus.
 * Dragging it moves the block, and its menu moves, copies or deletes it.
 */
export function EditorBlockHandle({
  editor,
  openMenuRef,
  containers,
  canAdd = false
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
          ? blockAt(current.state, current.state.selection.from, containers)
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
  const shownRef = useRef(shown)
  useLayoutEffect(() => {
    shownRef.current = shown
  })

  useEffect(() => {
    if (!wrapper || !host) return
    let current: number | null = null
    // On the handle, its block stays, even once the editor loses focus: on
    // touch that's the caret's block, with no hover before the tap.
    const pin = () => {
      current = shownRef.current
      setHovered(current)
    }
    const onMove = (event: MouseEvent) => {
      if (host.contains(event.target as Node)) {
        pin()
        return
      }
      const keep =
        current != null &&
        blockAt(editor.state, current, containers) === current &&
        inGutterOf(editor, current, event)
      if (!keep) current = blockAtPointer(editor, event, containers)
      setHovered(current)
    }
    const onLeave = () => {
      current = null
      setHovered(null)
    }
    wrapper.addEventListener('mousemove', onMove)
    wrapper.addEventListener('mouseleave', onLeave)
    host.addEventListener('pointerdown', pin)
    return () => {
      wrapper.removeEventListener('mousemove', onMove)
      wrapper.removeEventListener('mouseleave', onLeave)
      host.removeEventListener('pointerdown', pin)
    }
  }, [editor, wrapper, host, containers])

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
      setMenuAt(blockAt(editor.state, from, containers))
    }
    return () => {
      openMenuRef.current = null
    }
  }, [editor, openMenuRef, containers])

  // After every change, as text above or in the block moves it.
  useLayoutEffect(() => {
    setPlace(wrapper && shown != null ? placeAt(editor, wrapper, shown) : null)
  }, [editor, wrapper, shown, doc])

  if (!wrapper || !editable || shown == null || !place) return null

  const parent = parentBlock(editor.state, shown, containers)
  const parentName = parent === null ? null : doc.nodeAt(parent)!.type.name

  const run = (action: (pos: number) => Transaction | null) => {
    const tr = action(shown)
    // Its own undo step, even straight after the last.
    if (tr) editor.view.dispatch(closeHistory(tr))
  }

  const onDragStart = (event: React.DragEvent) => {
    const { view } = editor
    const dom = view.nodeDOM(shown)
    const node = view.state.doc.nodeAt(shown)!
    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, shown))
    )
    // Closed, so a nested block drops as itself rather than with its parents.
    const slice = new Slice(Fragment.from(node), 0, 0)
    const { dom: html, text } = view.serializeForClipboard(slice)
    event.dataTransfer.clearData()
    event.dataTransfer.setData('text/html', html.innerHTML)
    event.dataTransfer.setData('text/plain', text)
    // Not copyMove: UniqueID would treat the drop as a copy and give new ids.
    event.dataTransfer.effectAllowed = 'move'
    if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 0)
    view.dragging = { slice, move: true }
    draggedBlocks.set(view, { from: shown, containers })
  }

  return createPortal(
    <>
      {canAdd ? (
        <IconButton
          size='xs'
          emphasis='subtler'
          aria-label='Add block'
          // As the grip: Mod+/ and `/` are the keyboard paths.
          tabIndex={-1}
          data-slot='editor-block-add'
          className='absolute text-subtle'
          style={{ top: place.top, left: place.left - HANDLE_SIZE }}
          onClick={() => addAfter(editor, shown)}
        >
          <PlusIcon weight='bold' className='size-4' aria-hidden />
        </IconButton>
      ) : null}
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
                draggedBlocks.delete(editor.view)
              }}
            >
              <DotsSixVerticalIcon
                weight='bold'
                className='size-4'
                aria-hidden
              />
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
            disabled={!canMoveBlock(doc, shown, -1, containers)}
            onClick={() =>
              run((pos) => moveBlock(editor.state, pos, -1, containers))
            }
          >
            Move up
          </Menu.Item>
          <Menu.Item
            icon={<ArrowDownIcon weight='bold' />}
            disabled={!canMoveBlock(doc, shown, 1, containers)}
            onClick={() =>
              run((pos) => moveBlock(editor.state, pos, 1, containers))
            }
          >
            Move down
          </Menu.Item>
          {parent !== null ? (
            <Menu.Item
              icon={<SelectionPlusIcon weight='bold' />}
              // Stays open on the parent, the keyboard's way to a section.
              closeOnClick={false}
              onClick={() => setMenuAt(parent)}
            >
              {PARENT_LABELS[parentName!] ?? 'Select parent block'}
            </Menu.Item>
          ) : null}
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
      </Menu>
    </>,
    host!
  )
}
