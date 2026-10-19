'use client'

import { type RefObject, useEffect, useRef } from 'react'

import { type EditorState, NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { Control } from './EditorToolbarEngine'
import {
  type EditorControlUi,
  type EditorNodeType,
  nodeControls
} from './controls'
import { EDITOR_TOOLBAR_SIZE, type EditorSize } from './variants'

const LABELS: Record<EditorNodeType, string> = {
  image: 'Image actions',
  embed: 'Embed actions'
}

const ENABLED = { pressed: false, enabled: true }

/** The image or embed the selection is on, which has its own toolbar. */
export function selectedNodeType(
  state: EditorState
): EditorNodeType | undefined {
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return undefined
  const { name } = selection.node.type
  return name === 'image' || name === 'embed' ? name : undefined
}

// Keeps the toolbar this far inside the node's media, clear of its edges.
const INSET = 8

function selectedMedia(editor: TiptapEditor) {
  const node = editor.view.nodeDOM(editor.state.selection.from)
  if (!(node instanceof HTMLElement)) return undefined
  return node.querySelector('img, iframe') ?? node
}

/**
 * A line across the media's top, so the toolbar hangs inside it at the
 * top-end corner. Once the top scrolls off, the line follows the viewport's
 * top, stopping where the toolbar would leave the media.
 */
function insideTopEdge(editor: TiptapEditor, menu: HTMLElement | null) {
  const media = selectedMedia(editor)
  if (!media) return null
  const box = media.getBoundingClientRect()
  const lowest = box.bottom - (menu?.offsetHeight ?? 0) - INSET
  const top = Math.max(Math.min(Math.max(box.top, 0) + INSET, lowest), box.top)
  const edge = new DOMRect(box.left + INSET, top, box.width - 2 * INSET, 0)
  return { getBoundingClientRect: () => edge, getClientRects: () => [edge] }
}

const PLUGIN_KEY = 'editorNodeToolbar'

/**
 * The menu places itself as it shows, before React renders its controls, so
 * an empty menu's zero width put its start at the media's end. Placing it
 * again whenever its size changes keeps its end inside the media.
 */
function useRepositionOnResize(
  editor: TiptapEditor,
  menuRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const observer = new ResizeObserver(() => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr
          .setMeta(PLUGIN_KEY, 'updatePosition')
          .setMeta('addToHistory', false)
      )
    })
    observer.observe(menu)
    return () => observer.disconnect()
  }, [editor, menuRef])
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

/** A selected image's or embed's actions, inside its top-end corner. */
export function EditorNodeToolbar({
  editor,
  size,
  ui,
  toolbarRef
}: EditorNodeToolbarProps) {
  const type = useEditorState({
    editor,
    selector: ({ editor: current }) => selectedNodeType(current.state)
  })
  const menuRef = useRef<HTMLDivElement>(null)
  useRepositionOnResize(editor, menuRef)
  const toolbarSize = EDITOR_TOOLBAR_SIZE[size]
  const floating = {
    placement: 'bottom-end',
    offset: 0,
    // Flipping would put it back above the node, over the text there.
    flip: false,
    // The plugin makes its element a tab stop; the toolbar inside is the one.
    onShow: () => menuRef.current?.setAttribute('tabindex', '-1')
  } as const
  const controls = type
    ? nodeControls[type].filter((control) => control.available?.(ui) ?? true)
    : []

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
          {controls.map((control) => (
            <Control
              key={control.label}
              control={control}
              state={ENABLED}
              editor={editor}
              ui={ui}
            />
          ))}
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}
