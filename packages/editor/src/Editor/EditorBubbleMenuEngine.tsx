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
export function selectsText({ selection, doc }: EditorState) {
  if (selection.empty) return false
  if (selection instanceof NodeSelection) return false
  if (selection instanceof CellSelection) return false
  if (selection.$from.parent.type.spec.code) return false
  return doc.textBetween(selection.from, selection.to).length > 0
}

export function EditorBubbleMenuEngine(props: EditorBubbleMenuProps) {
  const { editor } = use(EditorContext)!
  return editor ? <SelectionMenu editor={editor} {...props} /> : null
}

function SelectionMenu({
  editor,
  children,
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

  useEffect(() => {
    editingLinkRef.current = editingLink
    // Focus moves to the link editor, but a click on the menu's Link keeps
    // the menu from hiding on that blur.
    if (editingLink && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta(PLUGIN_KEY, 'hide'))
    }
  }, [editor, editingLink])

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
      shouldShow={shouldShow}
      ref={menuRef}
      options={{
        placement: 'top',
        offset: 8,
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
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') editor.commands.focus()
          }}
          {...props}
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
