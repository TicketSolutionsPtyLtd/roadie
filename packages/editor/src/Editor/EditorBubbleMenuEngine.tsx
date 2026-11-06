'use client'

import { type ReactNode, use, useEffect, useRef, useState } from 'react'

import type { MiddlewareState } from '@floating-ui/dom'
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
  BlocksButton,
  Control,
  type ControlState,
  ToolbarItems,
  availableItems,
  controlUi,
  stateOf
} from './EditorToolbarEngine'
import { BlockSelection } from './blockSelection'
import { SECTION_CONTROLS, controlRects } from './canvasControls'
import {
  type EditorControl,
  type EditorControlUi,
  floatingControls,
  overflowControls,
  undo
} from './controls'
import { focusEditor } from './focusEditor'
import { useShowsShortcuts } from './menuGroups'
import {
  EDITOR_TOOLBAR_SIZE,
  type EditorSize,
  type EditorToolbarMode
} from './variants'

const PLUGIN_KEY = 'editorBubbleMenu'

/** Whether the selection is text the menu's marks can format. */
function selectsText({ selection, doc, schema }: EditorState) {
  // A caret's own text block still falls between its ends.
  if (selection.empty) return false
  // A Mod-click selects the block, which has its own text.
  if (selection instanceof NodeSelection) return false
  if (selection instanceof CellSelection) return false
  // Selected blocks are acted on whole, from the block menu.
  if (selection instanceof BlockSelection) return false
  const marks = Object.values(schema.marks)
  let formattable = false
  doc.nodesBetween(selection.from, selection.to, (node, _pos, parent) => {
    // Not an email button's label, which takes no marks.
    formattable ||=
      node.isText &&
      marks.some((mark) => parent?.type.allowsMarkType(mark) ?? false)
    return !formattable
  })
  return formattable
}

export function hideBubbleMenu(editor: TiptapEditor) {
  editor.view.dispatch(
    editor.state.tr.setMeta(PLUGIN_KEY, 'hide').setMeta('addToHistory', false)
  )
}

const OFFSET = 8
/**
 * After a scroll or resize, placed once the table actions have taken their
 * default 60ms to move, as it reads where they are.
 */
export const RESIZE_DELAY = 80

/**
 * As the root boundary, so a scrolling container still clips the flip. It
 * replaces the viewport, so it starts no higher than the viewport's top.
 */
function between(top: number, bottom: number) {
  const y = Math.max(top, 0)
  return {
    rootBoundary: {
      x: 0,
      y,
      width: window.innerWidth,
      height: Math.max(bottom - y, 0)
    }
  }
}

/**
 * The bottom of the editor's own fields above its text, such as an email's
 * Preview text, which the menu keeps below.
 */
function chromeBottom(editor: TiptapEditor) {
  const content = editor.view.dom.closest('[data-slot="editor-content"]')
  let bottom = 0
  for (
    let sibling = content?.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    // Not one laid over the text, such as a block's floating controls.
    const { position } = getComputedStyle(sibling)
    if (position === 'absolute' || position === 'fixed') continue
    bottom = Math.max(bottom, sibling.getBoundingClientRect().bottom)
  }
  return bottom
}

/** The bounds clear of both the node actions and the editor's own fields. */
function clearOfChrome(
  editor: TiptapEditor,
  selection: { top: number; bottom: number }
) {
  const { top, bottom, keepPlacement } = clearOfActions(editor, selection)
  return {
    ...between(Math.max(top, chromeBottom(editor) + OFFSET), bottom),
    ...(keepPlacement && { fallbackStrategy: 'initialPlacement' as const })
  }
}

/**
 * Table actions sit above their node, or below it when there's no room, and
 * a node's actions may sit above or below the selection, so the menu flips
 * only within the side of the selection away from them. The plugin offsets
 * the menu after it flips, so the bounds allow for that.
 */
function clearOfActions(
  editor: TiptapEditor,
  selection: { top: number; bottom: number }
) {
  const page = { top: 0, bottom: window.innerHeight, keepPlacement: false }
  const actions = editor.view.dom.parentElement?.querySelector(
    '[data-slot="editor-table-toolbar"], [data-slot="editor-node-toolbar"]'
  )
  if (!actions) return page
  const box = actions.getBoundingClientRect()
  if (box.bottom <= selection.top) {
    return { ...page, top: box.bottom + OFFSET }
  }
  if (box.top >= selection.bottom) {
    // With no room either side, off the top of the page, not over them.
    return { top: 0, bottom: box.top - OFFSET, keepPlacement: true }
  }
  return page
}

/**
 * Shifts the menu clear of a section's Settings and badge level with it, to
 * the side away from them. Runs before the offset, so it allows for that.
 */
function clearOfSectionControls(
  editor: TiptapEditor,
  { y, placement, rects: { reference, floating } }: MiddlewareState
) {
  const top = y + (placement.startsWith('top') ? -OFFSET : OFFSET)
  const bottom = top + floating.height
  const middle = reference.x + reference.width / 2
  let left = 0
  let right = document.documentElement.clientWidth
  const frame = editor.view.dom.closest('[data-slot="editor"]')
  for (const control of controlRects(frame, SECTION_CONTROLS)) {
    if (control.bottom <= top || control.top >= bottom) continue
    if (control.left + control.width / 2 >= middle) {
      right = Math.min(right, control.left - OFFSET)
    } else {
      left = Math.max(left, control.right + OFFSET)
    }
  }
  return {
    rootBoundary: {
      x: left,
      y: 0,
      width: Math.max(right - left, 0),
      height: window.innerHeight
    }
  }
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
    setToolbar,
    openBlocks
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
  const undoable = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current.isEditable && current.can().undo()
  })
  // The plugin asks shouldShow only when the selection or doc changes. Focus
  // moves to the link editor, but a click on the menu's Link keeps the menu
  // from hiding on that blur, and turning read-only changes neither.
  useEffect(() => {
    editingLinkRef.current = editingLink
    if ((editable && !editingLink) || editor.isDestroyed) return
    hideBubbleMenu(editor)
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
    // A frame on, once the toolbar has listed its controls, or the arrow keys
    // start from none and the first press lands on the control focused.
    const frame = requestAnimationFrame(() => {
      focusOnShowRef.current = false
      bubbleMenuRef.current
        ?.querySelector<HTMLElement>('button:not([aria-disabled="true"])')
        ?.focus()
    })
    return () => cancelAnimationFrame(frame)
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
      resizeDelay={RESIZE_DELAY}
      shouldShow={shouldShow}
      ref={menuRef}
      options={{
        placement: 'top',
        offset: OFFSET,
        flip: ({ elements }) =>
          clearOfChrome(editor, elements.reference.getBoundingClientRect()),
        shift: (state) => clearOfSectionControls(editor, state),
        // The plugin makes its element a tab stop; the toolbar inside is the one.
        onShow: () => {
          menuRef.current?.setAttribute('tabindex', '-1')
          setShown(true)
        },
        onHide: () => {
          forcedAtRef.current = null
          focusOnShowRef.current = false
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
            // Tab leaves the one Tab stop for the text it formats, not the
            // page past the menu, which sits outside the reading order.
            const inToolbar = event.currentTarget.contains(event.target as Node)
            if (event.key === 'Tab' && inToolbar) {
              event.preventDefault()
              forcedAtRef.current = null
              focusEditor(editor)
              return
            }
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
          <BlocksButton openBlocks={openBlocks} separator='before' />
          {children}
          {undoable ? (
            <>
              <Toolbar.Separator />
              <Control
                control={undo}
                state={{ pressed: false, enabled: true }}
                editor={editor}
                ui={ui}
              />
            </>
          ) : null}
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
  const showsShortcuts = useShowsShortcuts()
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
          // At once, as Firefox drops a caret move made before a deferred focus lands.
          focusEditor(editor)
          return false
        }}
      >
        {controls.map((control, index) => (
          <Menu.Item
            key={control.label}
            icon={<control.icon weight='bold' />}
            shortcut={showsShortcuts ? control.shortcut : undefined}
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
