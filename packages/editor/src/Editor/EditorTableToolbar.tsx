'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { CaretDownIcon } from '@phosphor-icons/react'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import { useRepositionOnResize } from './EditorNodeToolbar'
import { Control, type ControlState, stateOf } from './EditorToolbarEngine'
import {
  type EditorControlUi,
  type EditorTableItem,
  type EditorTableMenu,
  SEPARATOR,
  tableControls
} from './controls'
import { selectedTable } from './table'
import { EDITOR_TOOLBAR_SIZE, type EditorSize } from './variants'

const PLUGIN_KEY = 'editorTableToolbar'

function visibleRect(element: Element, scroller: Element) {
  const box = element.getBoundingClientRect()
  const view = scroller.getBoundingClientRect()
  const left = Math.max(box.left, view.left)
  const top = Math.max(box.top, view.top)
  const right = Math.min(box.right, view.right)
  const bottom = Math.min(box.bottom, view.bottom)
  return new DOMRect(left, top, Math.max(0, right - left), bottom - top)
}

// The table node's DOM is its full-width `.prose-scroll`, so the box is the
// table clipped to it: a wide table's toolbar stays over the part in view.
function tableBox(editor: TiptapEditor) {
  const table = selectedTable(editor.state)
  const scroller = table && editor.view.nodeDOM(table.pos)
  const element =
    scroller instanceof HTMLElement && scroller.querySelector('table')
  if (!element) return null
  const rect = () => visibleRect(element, scroller)
  return { getBoundingClientRect: rect, getClientRects: () => [rect()] }
}

function stateOfItem(item: EditorTableItem, editor: TiptapEditor) {
  if (item !== SEPARATOR && 'kind' in item) {
    return item.items.map((action) => stateOf(action, editor))
  }
  return stateOf(item, editor)
}

type TableMenuProps = {
  menu: EditorTableMenu
  states: readonly (ControlState | undefined)[]
  editor: TiptapEditor
  ui: EditorControlUi
}

function TableMenu({ menu, states, editor, ui }: TableMenuProps) {
  return (
    <Menu>
      <Menu.Trigger
        render={
          <Toolbar.Button>
            {menu.label}
            <CaretDownIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        finalFocus={() => {
          editor.commands.focus()
          return false
        }}
      >
        {menu.items.map((item, index) => {
          if (item === SEPARATOR) return <Menu.Separator key={index} />
          const Icon = item.icon
          return (
            <Menu.Item
              key={item.label}
              icon={<Icon weight='bold' />}
              intent={item.intent}
              disabled={!states[index]?.enabled}
              onClick={() => item.run(editor, ui)}
            >
              {item.label}
            </Menu.Item>
          )
        })}
      </Menu.Content>
    </Menu>
  )
}

// A read-only view can't take focus, so focus also keeps these off then.
const shouldShow: BubbleMenuProps['shouldShow'] = ({ view, state, element }) =>
  selectedTable(state) !== undefined &&
  (view.hasFocus() || element.contains(document.activeElement))

type EditorTableToolbarProps = {
  editor: TiptapEditor
  size: EditorSize
  ui: EditorControlUi
  toolbarRef: RefObject<HTMLDivElement | null>
}

/**
 * The actions of the table holding the selection, above its start corner, or
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
        ? tableControls.map((item) => stateOfItem(item, current))
        : undefined
  })
  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEditable
  })
  const menuRef = useRef<HTMLDivElement>(null)
  // The toolbar mounts once the plugin has put the menu in the page, as one
  // mounted while it's detached can't order its buttons, so none roves.
  const [shown, setShown] = useState(false)
  useRepositionOnResize(editor, menuRef, PLUGIN_KEY)
  // The plugin asks shouldShow only when the selection or doc changes, so
  // turning read-only with focus in these actions would leave them up.
  useEffect(() => {
    if (editable || editor.isDestroyed) return
    editor.view.dispatch(
      editor.state.tr.setMeta(PLUGIN_KEY, 'hide').setMeta('addToHistory', false)
    )
  }, [editor, editable])
  // Kept inside the content, so over a table that comes first it drops below
  // rather than over the Formatting toolbar. Read on each placement, as the
  // view mounts after this renders.
  const inContent = () => ({ boundary: editor.view.dom })
  const floating = {
    placement: 'top-start',
    offset: 4,
    flip: () => ({
      ...inContent(),
      fallbackPlacements: ['bottom-start' as const]
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
          {tableControls.map((item, index) => {
            const state = states[index]
            if (item === SEPARATOR) return <Toolbar.Separator key={index} />
            if ('kind' in item) {
              return (
                <TableMenu
                  key={item.label}
                  menu={item}
                  states={Array.isArray(state) ? state : []}
                  editor={editor}
                  ui={ui}
                />
              )
            }
            return (
              <Control
                key={item.label}
                control={item}
                state={Array.isArray(state) ? undefined : state}
                editor={editor}
                ui={ui}
              />
            )
          })}
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}
