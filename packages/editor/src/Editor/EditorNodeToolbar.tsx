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
  columns: 'Columns actions',
  variable: 'Merge tag actions'
}

const SELECTABLE = new Set<EditorNodeType>([
  'image',
  'embed',
  'spacer',
  'variable'
])
const HOLDING = new Set<EditorNodeType>(['button', 'columns'])

/**
 * The node with its own toolbar: a selected image, embed or spacer, or the
 * button or columns holding the selection.
 */
export function selectedNode(
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
// How far a toolbar below its node sits from it.
const GAP = 4

// Toolbars that would cover the text they act on sit below their node.
const BELOW = new Set<EditorNodeType>(['button', 'variable'])

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

/**
 * Where the top of the view is for the toolbar: under the editor's docked
 * bar while that's stuck over the node, as the node scrolls under it.
 */
function visibleTop(editor: TiptapEditor) {
  const bar = editor.view.dom
    .closest('[data-slot="editor"]')
    ?.querySelector('[data-slot="editor-toolbar"]')
  return Math.max(bar?.getBoundingClientRect().bottom ?? 0, 0)
}

const virtualLine = (edge: DOMRect) => ({
  getBoundingClientRect: () => edge,
  getClientRects: () => [edge]
})

// Blocks whose text a toolbar inside them would cover, so it goes beside
// them where the frame has room.
const BESIDE = new Set<EditorNodeType>(['spacer', 'columns'])

/**
 * A line across the node's top, so the toolbar hangs inside it at the
 * top-end corner. Once the top scrolls off, or under the docked bar, the line
 * follows that edge, stopping where the toolbar would leave the node. Spacers
 * and columns put it past their end instead where the frame has room, a
 * spacer's across its middle. Below a node, the line is the toolbar's width
 * from the node's start, so the toolbar's end meets it there.
 */
function insideTopEdge(editor: TiptapEditor, menu: HTMLElement | null) {
  const selected = selectedElement(editor)
  if (!selected) return null
  const box = selected.element.getBoundingClientRect()
  const height = menu?.offsetHeight ?? 0
  const width = menu?.offsetWidth ?? 0
  if (BELOW.has(selected.type)) {
    return virtualLine(new DOMRect(box.left, box.bottom + GAP, width, 0))
  }
  const lowest = box.bottom - height - INSET
  const top =
    selected.type === 'spacer'
      ? box.top + (box.height - height) / 2
      : Math.max(
          Math.min(Math.max(box.top, visibleTop(editor)) + INSET, lowest),
          box.top
        )
  const frame = editor.view.dom.closest('[data-slot="editor"]')
  const besideEnd = box.right + GAP + width
  if (
    BESIDE.has(selected.type) &&
    frame &&
    besideEnd <= frame.getBoundingClientRect().right - INSET
  ) {
    return virtualLine(new DOMRect(box.right + GAP, top, width, 0))
  }
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
 * A selected node's actions: inside the top-end corner of an image or an
 * embed, past the end of a spacer or columns where there's room, and below a
 * button or merge tag.
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
      // Under the docked bar, as the node it's pinned to scrolls under it.
      className='z-docked'
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
          // Keeps a dialog around the editor open. An open menu's own Escape
          // comes from its portal, outside the toolbar.
          onKeyDown={(event) => {
            const inToolbar = event.currentTarget.contains(event.target as Node)
            if (event.key === 'Escape' && inToolbar) event.stopPropagation()
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
