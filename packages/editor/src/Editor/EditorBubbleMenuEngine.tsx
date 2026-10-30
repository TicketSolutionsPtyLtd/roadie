'use client'

import { type ReactNode, use, useEffect, useRef, useState } from 'react'

import { DotsThreeIcon, PushPinIcon } from '@phosphor-icons/react'
import { type EditorState, NodeSelection, Selection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import type { EditorBubbleMenuProps } from './EditorBubbleMenu'
import { EditorContext } from './EditorContext'
import { useRepositionOnResize } from './EditorNodeToolbar'
import {
  type ControlState,
  ToolbarItems,
  availableItems,
  controlUi,
  stateOf
} from './EditorToolbarEngine'
import {
  type EditorControl,
  type EditorControlUi,
  floatingControls,
  overflowControls
} from './controls'
import { focusEditor } from './focusEditor'
import { selectedTable } from './table'
import {
  EDITOR_TOOLBAR_SIZE,
  type EditorSize,
  type EditorToolbarMode
} from './variants'

const PLUGIN_KEY = 'editorBubbleMenu'

/** Whether the selection is text the menu's marks can format. */
export function selectsText({ selection, doc }: EditorState) {
  if (selection.empty) return false
  // A Mod-click selects the block, which has its own text.
  if (selection instanceof NodeSelection) return false
  if (selection instanceof CellSelection) return false
  if (selection.$from.parent.type.spec.code) return false
  return doc.textBetween(selection.from, selection.to).length > 0
}

/** Whether a caret sits in text, where Alt+F10 can open the menu. */
function caretInText({ selection }: EditorState) {
  return (
    selection.empty &&
    selection.$from.parent.isTextblock &&
    !selection.$from.parent.type.spec.code
  )
}

export function EditorBubbleMenuEngine(props: EditorBubbleMenuProps) {
  const { editor, toolbar } = use(EditorContext)!
  if (!editor || toolbar !== 'floating') return null
  return <SelectionMenu editor={editor} {...props} />
}

function SelectionMenu({
  editor,
  children,
  onKeyDownCapture,
  ...props
}: EditorBubbleMenuProps & { editor: TiptapEditor }) {
  const context = use(EditorContext)!
  const {
    preset,
    size,
    editingLink,
    bubbleMenuRef,
    openBubbleMenuRef,
    toolbarExtras,
    pinnable,
    setToolbar
  } = context
  const ui = controlUi(context)
  const items = availableItems(floatingControls[preset], ui)
  const overflow = availableItems(overflowControls[preset], ui)
  const menuRef = useRef<HTMLDivElement>(null)
  const editingLinkRef = useRef(editingLink)
  // A menu's popup takes focus outside the toolbar, which stays meanwhile.
  const menuOpenRef = useRef(false)
  // Alt+F10 at a caret opens the toolbar there, until the selection moves.
  const forcedAtRef = useRef<Selection | null>(null)
  const focusOnShowRef = useRef(false)
  // The toolbar mounts once the plugin has put the menu in the document, as
  // its arrow keys order the buttons by their place there.
  const [shown, setShown] = useState(false)
  const forced = (state: EditorState) =>
    forcedAtRef.current !== null &&
    state.selection.eq(forcedAtRef.current) &&
    caretInText(state)
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      selectsText(current.state) || forced(current.state)
        ? [...items, ...overflow].map((item) => stateOf(item, current))
        : null
  })

  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEditable
  })
  // Table actions sit above the table, or below one that starts the
  // content, so in a table this takes the other side of the selection.
  const placement = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const table = selectedTable(current.state)
      return table && table.pos > 0 ? 'bottom' : 'top'
    }
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

  useEffect(() => {
    openBubbleMenuRef.current = () => {
      if (!editor.isEditable || !caretInText(editor.state)) return false
      forcedAtRef.current = editor.state.selection
      focusOnShowRef.current = true
      editor.view.dispatch(
        editor.state.tr
          .setMeta(PLUGIN_KEY, 'show')
          .setMeta('addToHistory', false)
      )
      return true
    }
    return () => {
      openBubbleMenuRef.current = null
    }
  }, [editor, openBubbleMenuRef])

  useEffect(() => {
    if (!shown || !states || !focusOnShowRef.current) return
    focusOnShowRef.current = false
    bubbleMenuRef.current
      ?.querySelector<HTMLElement>('button:not([aria-disabled="true"])')
      ?.focus()
  }, [shown, states, bubbleMenuRef])

  useRepositionOnResize(editor, menuRef, PLUGIN_KEY)

  const shouldShow: BubbleMenuProps['shouldShow'] = ({
    editor: current,
    view,
    state,
    element
  }) =>
    current.isEditable &&
    !editingLinkRef.current &&
    (selectsText(state) || forced(state)) &&
    (view.hasFocus() ||
      element.contains(document.activeElement) ||
      menuOpenRef.current)

  const onMenuOpenChange = (open: boolean) => {
    menuOpenRef.current = open
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={PLUGIN_KEY}
      shouldShow={shouldShow}
      ref={menuRef}
      options={{
        placement,
        offset: 8,
        // The plugin makes its element a tab stop; the toolbar inside is the one.
        onShow: () => {
          menuRef.current?.setAttribute('tabindex', '-1')
          setShown(true)
        },
        onHide: () => {
          forcedAtRef.current = null
          setShown(false)
        }
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
            if (event.key !== 'Escape') return
            // Opened at a caret, it has no selection to stay over.
            forcedAtRef.current = null
            editor.commands.focus()
          }}
        >
          <ToolbarItems
            items={items}
            states={states}
            editor={editor}
            ui={ui}
            onMenuOpenChange={onMenuOpenChange}
          />
          {children}
          <OverflowMenu
            editor={editor}
            controls={overflow}
            states={states.slice(items.length)}
            ui={ui}
            extras={toolbarExtras}
            size={size}
            pinnable={pinnable}
            setToolbar={setToolbar}
            onOpenChange={onMenuOpenChange}
          />
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}

type OverflowMenuProps = {
  editor: TiptapEditor
  controls: readonly EditorControl[]
  states: readonly (ControlState | undefined)[]
  ui: EditorControlUi
  extras: ReactNode
  size: EditorSize
  pinnable: boolean
  setToolbar: (toolbar: EditorToolbarMode) => void
  onOpenChange: (open: boolean) => void
}

function OverflowMenu({
  editor,
  controls,
  states,
  ui,
  extras,
  size,
  pinnable,
  setToolbar,
  onOpenChange
}: OverflowMenuProps) {
  const run = (control: EditorControl) => {
    // An insert goes after the selected text rather than over it.
    const { to } = editor.state.selection
    editor.view.dispatch(
      editor.state.tr.setSelection(Selection.near(editor.state.doc.resolve(to)))
    )
    focusEditor(editor)
    control.run(editor, ui)
  }
  return (
    <Menu onOpenChange={onOpenChange}>
      <Menu.Trigger
        render={
          <Toolbar.Button aria-label='More'>
            <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        finalFocus={() => {
          editor.commands.focus()
          return false
        }}
      >
        {controls.map((control, index) => (
          <Menu.Item
            key={control.label}
            icon={<control.icon weight='bold' />}
            shortcut={control.shortcut}
            disabled={!states[index]?.enabled}
            onClick={() => run(control)}
          >
            {control.label}
          </Menu.Item>
        ))}
        {extras ? (
          <>
            <Menu.Separator />
            <Menu.Group aria-label='More controls'>
              <Toolbar
                flush
                emphasis='subtler'
                size={EDITOR_TOOLBAR_SIZE[size]}
                aria-label='More controls'
              >
                {extras}
              </Toolbar>
            </Menu.Group>
          </>
        ) : null}
        {pinnable ? (
          <>
            <Menu.Separator />
            <Menu.Item
              icon={<PushPinIcon weight='bold' />}
              onClick={() => setToolbar('docked')}
            >
              Pin toolbar to top
            </Menu.Item>
          </>
        ) : null}
      </Menu.Content>
    </Menu>
  )
}
