'use client'

import { type RefObject, useRef, useState } from 'react'

import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { useRepositionOnResize } from './EditorNodeToolbar'
import { Control, stateOf } from './EditorToolbarEngine'
import { type EditorControlUi, SEPARATOR, tableControls } from './controls'
import { selectedTable } from './table'
import { EDITOR_TOOLBAR_SIZE, type EditorSize } from './variants'

const PLUGIN_KEY = 'editorTableToolbar'

// Its scroller, so a wide table's toolbar stays over the part in view.
function tableBox(editor: TiptapEditor) {
  const table = selectedTable(editor.state)
  const element = table && editor.view.nodeDOM(table.pos)
  if (!(element instanceof HTMLElement)) return null
  return {
    getBoundingClientRect: () => element.getBoundingClientRect(),
    getClientRects: () => [element.getBoundingClientRect()]
  }
}

const shouldShow: BubbleMenuProps['shouldShow'] = ({ view, state, element }) =>
  view.editable &&
  selectedTable(state) !== undefined &&
  (view.hasFocus() || element.contains(document.activeElement))

type EditorTableToolbarProps = {
  editor: TiptapEditor
  size: EditorSize
  ui: EditorControlUi
  toolbarRef: RefObject<HTMLDivElement | null>
}

/**
 * The actions of the table holding the selection, above its end corner, or
 * below it when the table starts the content.
 */
export function EditorTableToolbar({
  editor,
  size,
  ui,
  toolbarRef
}: EditorTableToolbarProps) {
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      selectedTable(current.state)
        ? tableControls.map((item) => stateOf(item, current))
        : undefined
  })
  const menuRef = useRef<HTMLDivElement>(null)
  // The toolbar mounts once the plugin has put the menu in the page, as one
  // mounted while it's detached can't order its buttons, so none roves.
  const [shown, setShown] = useState(false)
  useRepositionOnResize(editor, menuRef, PLUGIN_KEY)
  // Kept inside the content, so over a table that comes first it drops below
  // rather than over the Formatting toolbar. Read on each placement, as the
  // view mounts after this renders.
  const inContent = () => ({ boundary: editor.view.dom })
  const floating = {
    placement: 'top-end',
    offset: 4,
    flip: () => ({
      ...inContent(),
      fallbackPlacements: ['bottom-end' as const]
    }),
    shift: inContent,
    onShow: () => {
      // The plugin makes its element a tab stop; the toolbar inside is the one.
      menuRef.current?.setAttribute('tabindex', '-1')
      setShown(true)
    },
    onHide: () => setShown(false)
  } as const

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={PLUGIN_KEY}
      updateDelay={0}
      shouldShow={shouldShow}
      getReferencedVirtualElement={() => tableBox(editor)}
      ref={menuRef}
      options={floating}
      data-slot='editor-table-toolbar'
      className='z-sticky'
    >
      {states && shown ? (
        <Toolbar
          ref={toolbarRef}
          aria-label='Table actions'
          size={EDITOR_TOOLBAR_SIZE[size]}
          emphasis='floating'
          // Captured, as an open tooltip keeps Escape from bubbling.
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') editor.commands.focus()
          }}
        >
          {tableControls.map((item, index) =>
            item === SEPARATOR ? (
              <Toolbar.Separator key={index} />
            ) : (
              <Control
                key={item.label}
                control={item}
                state={states[index]}
                editor={editor}
                ui={ui}
              />
            )
          )}
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}
