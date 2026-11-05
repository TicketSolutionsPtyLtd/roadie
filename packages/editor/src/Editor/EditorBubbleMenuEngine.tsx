'use client'

import { use, useEffect, useRef, useState } from 'react'

import { type EditorState, NodeSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import type { EditorBubbleMenuProps } from './EditorBubbleMenu'
import { EditorContext } from './EditorContext'
import { useRepositionOnResize } from './EditorNodeToolbar'
import { Control, stateOf } from './EditorToolbarEngine'
import { selectionControls } from './controls'
import { EDITOR_TOOLBAR_SIZE } from './variants'

const PLUGIN_KEY = 'editorBubbleMenu'

/** Whether the selection is text the menu's marks can format. */
function selectsText({ selection, doc }: EditorState) {
  // A Mod-click selects the block, which has its own text.
  if (selection instanceof NodeSelection) return false
  if (selection instanceof CellSelection) return false
  return doc.textBetween(selection.from, selection.to).length > 0
}

const OFFSET = 8
/**
 * After a scroll or resize, placed once the table actions have taken their
 * default 60ms to move, as it reads where they are.
 */
export const RESIZE_DELAY = 80

const between = (top: number, bottom: number) => ({
  boundary: { x: 0, y: top, width: window.innerWidth, height: bottom - top }
})

/**
 * Table actions sit above the table, or below it when there's no room, so the
 * menu flips only within the side of the selection away from them. The plugin
 * offsets the menu after it flips, so the bounds allow for that.
 */
function clearOfTableActions(
  editor: TiptapEditor,
  selection: { top: number; bottom: number }
) {
  const actions = editor.view.dom.parentElement?.querySelector(
    '[data-slot="editor-table-toolbar"]'
  )
  if (!actions) return {}
  const box = actions.getBoundingClientRect()
  if (box.bottom <= selection.top) {
    return between(box.bottom + OFFSET, window.innerHeight)
  }
  if (box.top >= selection.bottom) {
    // With no room either side, off the top of the page, not over them.
    return {
      ...between(0, box.top - OFFSET),
      fallbackStrategy: 'initialPlacement' as const
    }
  }
  return {}
}

export function EditorBubbleMenuEngine(props: EditorBubbleMenuProps) {
  const { editor } = use(EditorContext)!
  return editor ? <SelectionMenu editor={editor} {...props} /> : null
}

function SelectionMenu({
  editor,
  children,
  onKeyDownCapture,
  ...props
}: EditorBubbleMenuProps & { editor: TiptapEditor }) {
  const {
    preset,
    size,
    editingLink,
    bubbleMenuRef,
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage
  } = use(EditorContext)!
  const ui = { editLink, editAlt, editEmbed, pickImage, replaceImage }
  const controls = selectionControls[preset]
  const menuRef = useRef<HTMLDivElement>(null)
  const editingLinkRef = useRef(editingLink)
  // The toolbar mounts once the plugin has put the menu in the document, as
  // its arrow keys order the buttons by their place there.
  const [shown, setShown] = useState(false)
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      selectsText(current.state)
        ? controls.map((control) => stateOf(control, current))
        : null
  })

  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEditable
  })
  // The plugin asks shouldShow only when the selection or doc changes. Focus
  // moves to the link editor, but a click on the menu's Link keeps the menu
  // from hiding on that blur, and turning read-only changes neither.
  useEffect(() => {
    editingLinkRef.current = editingLink
    if ((editable && !editingLink) || editor.isDestroyed) return
    editor.view.dispatch(
      editor.state.tr.setMeta(PLUGIN_KEY, 'hide').setMeta('addToHistory', false)
    )
  }, [editor, editingLink, editable])

  useRepositionOnResize(editor, menuRef, PLUGIN_KEY)

  const shouldShow: BubbleMenuProps['shouldShow'] = ({
    editor: current,
    view,
    state,
    element
  }) =>
    current.isEditable &&
    !editingLinkRef.current &&
    selectsText(state) &&
    (view.hasFocus() || element.contains(document.activeElement))

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={PLUGIN_KEY}
      resizeDelay={RESIZE_DELAY}
      shouldShow={shouldShow}
      ref={menuRef}
      options={{
        placement: 'top',
        offset: OFFSET,
        flip: ({ elements }) =>
          clearOfTableActions(
            editor,
            elements.reference.getBoundingClientRect()
          ),
        // The plugin makes its element a tab stop; the toolbar inside is the one.
        onShow: () => {
          menuRef.current?.setAttribute('tabindex', '-1')
          setShown(true)
        },
        onHide: () => setShown(false)
      }}
      data-slot='editor-bubble-menu'
      className='z-sticky'
    >
      {shown && states ? (
        <Toolbar
          ref={bubbleMenuRef}
          aria-label='Selection formatting'
          size={EDITOR_TOOLBAR_SIZE[size]}
          emphasis='floating'
          // Captured, as an open tooltip keeps Escape from bubbling.
          {...props}
          onKeyDownCapture={(event) => {
            onKeyDownCapture?.(event)
            if (event.key === 'Escape') editor.commands.focus()
          }}
        >
          {controls.map((control, index) => (
            <Control
              key={control.label}
              control={control}
              state={states[index]}
              editor={editor}
              ui={ui}
            />
          ))}
          {children}
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}
