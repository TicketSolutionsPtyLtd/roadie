'use client'

import { type RefObject, useEffect, useRef } from 'react'

import { type EditorState, NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { BlockMenu, Control, stateOf } from './EditorToolbarEngine'
import {
  type EditorControlUi,
  type EditorNodeType,
  nodeControls
} from './controls'
import { EDITOR_TOOLBAR_SIZE, type EditorSize } from './variants'

const LABELS: Record<EditorNodeType, string> = {
  image: 'Image actions',
  embed: 'Embed actions',
  spacer: 'Spacer actions',
  button: 'Button actions',
  columns: 'Columns actions'
}

const SELECTABLE = new Set<EditorNodeType>(['image', 'embed', 'spacer'])
const HOLDING = new Set<EditorNodeType>(['button', 'columns'])

/**
 * The node with its own toolbar: a selected image, embed or spacer, or the
 * button or columns holding the selection.
 */
function selectedNode(
  state: EditorState
): { type: EditorNodeType; pos: number } | undefined {
  const { selection } = state
  if (selection instanceof NodeSelection) {
    const type = selection.node.type.name as EditorNodeType
    if (SELECTABLE.has(type)) return { type, pos: selection.from }
  }
  const { $from, to } = selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const type = $from.node(depth).type.name as EditorNodeType
    if (HOLDING.has(type) && to <= $from.end(depth)) {
      return { type, pos: $from.before(depth) }
    }
  }
  return undefined
}

export const selectedNodeType = (state: EditorState) =>
  selectedNode(state)?.type

// Keeps the toolbar this far inside the node's media, clear of its edges.
const INSET = 8
// How far a toolbar beside its node sits from it.
const GAP = 4

// Toolbars that would cover the text they act on sit beside their node.
const BESIDE: Partial<Record<EditorNodeType, 'above' | 'below'>> = {
  button: 'below',
  spacer: 'below',
  columns: 'above'
}

function selectedElement(editor: TiptapEditor) {
  const found = selectedNode(editor.state)
  if (!found) return undefined
  const node = editor.view.nodeDOM(found.pos)
  if (!(node instanceof HTMLElement)) return undefined
  const media = found.type === 'image' || found.type === 'embed'
  return {
    type: found.type,
    element: (media && node.querySelector('img, iframe')) || node
  }
}

const virtualLine = (edge: DOMRect) => ({
  getBoundingClientRect: () => edge,
  getClientRects: () => [edge]
})

/**
 * A line across the media's top, so the toolbar hangs inside it at the
 * top-end corner. Once the top scrolls off, the line follows the viewport's
 * top, stopping where the toolbar would leave the media. Beside a node, the
 * line is the toolbar's width from the node's start, so the toolbar's end
 * meets it there.
 */
function insideTopEdge(editor: TiptapEditor, menu: HTMLElement | null) {
  const selected = selectedElement(editor)
  if (!selected) return null
  const box = selected.element.getBoundingClientRect()
  const height = menu?.offsetHeight ?? 0
  const side = BESIDE[selected.type]
  if (side) {
    const above = box.top - GAP - height
    const roomAbove = above >= editor.view.dom.getBoundingClientRect().top
    const top = side === 'above' && roomAbove ? above : box.bottom + GAP
    return virtualLine(new DOMRect(box.left, top, menu?.offsetWidth ?? 0, 0))
  }
  const lowest = box.bottom - height - INSET
  const top = Math.max(Math.min(Math.max(box.top, 0) + INSET, lowest), box.top)
  return virtualLine(
    new DOMRect(box.left + INSET, top, box.width - 2 * INSET, 0)
  )
}

const PLUGIN_KEY = 'editorNodeToolbar'

/**
 * The menu places itself as it shows, before React renders its controls, so
 * an empty menu's zero width put its start at the media's end. Placing it
 * again whenever its size changes keeps its end inside the media.
 */
export function useRepositionOnResize(
  editor: TiptapEditor,
  menuRef: RefObject<HTMLDivElement | null>,
  pluginKey: string
) {
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const observer = new ResizeObserver(() => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr
          .setMeta(pluginKey, 'updatePosition')
          .setMeta('addToHistory', false)
      )
    })
    observer.observe(menu)
    return () => observer.disconnect()
  }, [editor, menuRef, pluginKey])
}

const shouldShow: BubbleMenuProps['shouldShow'] = ({ view, state, element }) =>
  selectedNodeType(state) !== undefined &&
  (view.hasFocus() || element.contains(document.activeElement))

type EditorNodeToolbarProps = {
  editor: TiptapEditor
  size: EditorSize
  ui: EditorControlUi
  toolbarRef: RefObject<HTMLDivElement | null>
}

/**
 * A selected node's actions: inside an image's or embed's top-end corner,
 * below a button or spacer, and above columns.
 */
export function EditorNodeToolbar({
  editor,
  size,
  ui,
  toolbarRef
}: EditorNodeToolbarProps) {
  const { type, states } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const selected = selectedNodeType(current.state)
      return {
        type: selected,
        states: selected
          ? nodeControls[selected].map((item) => stateOf(item, current))
          : []
      }
    }
  })
  const menuRef = useRef<HTMLDivElement>(null)
  useRepositionOnResize(editor, menuRef, PLUGIN_KEY)
  const toolbarSize = EDITOR_TOOLBAR_SIZE[size]
  const floating = {
    placement: 'bottom-end',
    offset: 0,
    // Flipping would put it back above the node, over the text there.
    flip: false,
    // The plugin makes its element a tab stop; the toolbar inside is the one.
    onShow: () => menuRef.current?.setAttribute('tabindex', '-1')
  } as const

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={PLUGIN_KEY}
      updateDelay={0}
      shouldShow={shouldShow}
      getReferencedVirtualElement={() => insideTopEdge(editor, menuRef.current)}
      ref={menuRef}
      options={floating}
      data-slot='editor-node-toolbar'
      className='z-sticky'
    >
      {type ? (
        <Toolbar
          ref={toolbarRef}
          aria-label={LABELS[type]}
          size={toolbarSize}
          // Over the image or player at every size.
          emphasis='floating'
          // Captured, as an open tooltip keeps Escape from bubbling.
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') editor.commands.focus()
          }}
        >
          {nodeControls[type].map((item, index) =>
            'kind' in item ? (
              <BlockMenu
                key={item.label}
                menu={item}
                state={states[index]}
                editor={editor}
              />
            ) : (item.available?.(ui) ?? true) ? (
              <Control
                key={item.label}
                control={item}
                state={states[index]}
                editor={editor}
                ui={ui}
              />
            ) : null
          )}
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}
