'use client'

import { type RefObject, useEffect, useRef } from 'react'

import { type EditorState, NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { EditorBlockMenuGroup } from './EditorBlockMenuGroup'
import { BlockMenu, Control, stateOf } from './EditorToolbarEngine'
import { GRIPS, SECTION_CONTROLS, controlRects } from './canvasControls'
import {
  type EditorBlockMenu,
  type EditorControlUi,
  type EditorNodeType,
  nodeControls
} from './controls'
import { useOnPhone } from './toolbarMode'
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

// A short block whose toolbar goes beside it where the frame has room.
const BESIDE = new Set<EditorNodeType>(['spacer'])

/**
 * A line across the node's top, so the toolbar hangs inside it at the
 * top-end corner. Once the top scrolls off, or under the docked bar, the line
 * follows that edge, stopping where the toolbar would leave the node. A
 * spacer puts it past its end instead where the frame has room, across its
 * middle. Columns put it beside or above themselves where that's clear,
 * else in their top-end corner; see `columnsPlace`. Below a node, the line is the
 * toolbar's width from the node's start, so the toolbar's end meets it there.
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
  if (selected.type === 'columns') {
    return virtualLine(columnsPlace(editor, selected.element, width, height))
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

/** The text's own line boxes in an element, not the block around them. */
function textRects(element: Element | null) {
  if (!element) return []
  const rects: DOMRect[] = []
  const range = document.createRange()
  // Each text node's own lines, as a range over the element also holds the
  // boxes of the blocks inside it.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    range.selectNodeContents(node)
    rects.push(...Array.from(range.getClientRects()))
  }
  return rects
}

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/**
 * The first place for the columns toolbar that's on screen and covers no
 * text or canvas control: past their end at the top, above their end or start, inside their
 * top-end or top-start corner, then in the top padding of the block holding
 * them. It never goes below them, where the next block's own controls and
 * badges sit. With none clear, it docks in their top-end corner.
 */
function columnsPlace(
  editor: TiptapEditor,
  element: Element,
  width: number,
  height: number
) {
  const box = element.getBoundingClientRect()
  // No higher than the text's own top, under the editor's fields above it.
  const content = editor.view.dom.closest('[data-slot="editor-content"]')
  const top = Math.max(
    visibleTop(editor),
    content?.getBoundingClientRect().top ?? 0
  )
  const frame = editor.view.dom.closest('[data-slot="editor"]')
  const frameRight = frame?.getBoundingClientRect().right ?? box.right
  const holder = element.parentElement?.closest('[data-type]')
  const inside = holder && editor.view.dom.contains(holder) ? holder : null
  // All of the holder's text, so its top padding stays clear of a heading.
  const text = textRects(inside ?? element.previousElementSibling).concat(
    inside ? [] : textRects(element)
  )
  const controls = controlRects(frame, `${GRIPS}, ${SECTION_CONTROLS}`)
  const corner = Math.max(
    Math.min(Math.max(box.top, top) + INSET, box.bottom - height - INSET),
    box.top
  )
  const padding = inside ? inside.getBoundingClientRect().top + INSET : -1
  // Each as the toolbar's top and where its end sits.
  const places = [
    [Math.max(box.top, top), box.right + GAP + width],
    [box.top - GAP - height, box.right],
    [box.top - GAP - height, box.left + width],
    [corner, box.right - INSET],
    [corner, box.left + INSET + width],
    [padding, box.right]
  ] as const
  const toolbarAt = ([y, end]: readonly [number, number]) =>
    new DOMRect(end - width, y, width, height)
  const fits = (place: readonly [number, number]) => {
    const toolbar = toolbarAt(place)
    return (
      toolbar.top >= top &&
      toolbar.bottom <= window.innerHeight &&
      toolbar.right <= frameRight - INSET &&
      text.every((rect) => !overlaps(rect, toolbar)) &&
      controls.every((rect) => !overlaps(rect, toolbar))
    )
  }
  // Then down the row's end, then its start, for a gap between its lines.
  const rows = Array.from(
    {
      length: Math.max(0, Math.floor((box.bottom - height - box.top) / 4)) + 1
    },
    (_, step) => box.top + step * 4
  )
  const scanned = [box.right, box.left + width].flatMap((edge) =>
    rows.map((row) => [row, edge] as const)
  )
  const [y, end] = places.find(fits) ?? scanned.find(fits) ?? places[3]
  return new DOMRect(end - width, y, width, 0)
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
  const phone = useOnPhone()
  const items = type ? nodeControls[type] : []
  const menus = items.filter((item): item is EditorBlockMenu => 'kind' in item)
  // A phone has no room for a button per menu beside the node.
  const grouped = phone && menus.length > 1
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
          {grouped ? (
            <EditorBlockMenuGroup
              label='Layout'
              menus={menus}
              states={menus.map((menu) => states[items.indexOf(menu)])}
              editor={editor}
            />
          ) : null}
          {items.map((item, index) =>
            grouped && 'kind' in item ? null : 'kind' in item ? (
              <BlockMenu
                key={item.label}
                menu={item}
                state={states[index]}
                editor={editor}
                headed
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
