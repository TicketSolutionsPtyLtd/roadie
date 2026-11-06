'use client'

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'

import { isMacOS } from '@tiptap/core'
import {
  NodeSelection,
  Selection,
  type SelectionBookmark,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Drawer } from '@oztix/roadie-components/drawer'

import type { EditorSetting } from '../extensions'
import { SettingField, type UploadSettingImage } from './EditorSettingFields'
import { itemElement } from './blockClick'
import { focusEditor } from './focusEditor'
import { useOnPhone } from './toolbarMode'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

type Attrs = Record<string, unknown>

/** A setting the editor draws itself, such as an email section's rule. */
export type EditorOwnSetting = {
  name: string
  type: 'own'
  render: (attrs: Attrs, set: (attrs: Attrs) => void) => ReactNode
}

/** What a block's Settings drawer edits, and its name for the heading. */
export type BlockSettings = {
  label: string
  settings: readonly (EditorSetting | EditorOwnSetting)[]
}

const shownWith =
  (attrs: Attrs) => (setting: EditorSetting | EditorOwnSetting) =>
    setting.type === 'own' || (setting.available?.(attrs) ?? true)

type SettingsFormProps = BlockSettings & {
  /** The block's attrs, which Undo can change while it's open. */
  attrs: Attrs
  live: LiveEdit
  onDone: () => void
  focusPath?: string
  onEditItem?: (path: string, editing: boolean) => void
  uploadImage?: UploadSettingImage
}

function SettingsForm({
  settings,
  attrs,
  live,
  onDone,
  focusPath,
  onEditItem,
  uploadImage
}: SettingsFormProps) {
  const set = (change: Attrs, ownStep = false) => {
    if (ownStep) live.step(setSelectedAttrs(change))
    else live.apply(setSelectedAttrs(change))
  }
  return (
    <div className='grid content-start gap-4'>
      {settings.filter(shownWith(attrs)).map((setting) =>
        setting.type === 'own' ? (
          <div key={setting.name} className='grid'>
            {setting.render(attrs, set)}
          </div>
        ) : (
          <SettingField
            key={setting.name}
            setting={setting}
            value={attrs[setting.name]}
            onValueChange={(value, ownStep) =>
              set({ [setting.name]: value }, ownStep)
            }
            onDone={onDone}
            path={setting.name}
            focusPath={focusPath}
            onEditItem={onEditItem}
            uploadImage={uploadImage}
          />
        )
      )}
    </div>
  )
}

/**
 * Brings an element a fifth of the screen down, clear of a sticky bar above
 * it and of the sheet below, moving only if it isn't there already. Each
 * scroller from it out takes what it can of the move, as one may be at its
 * end.
 */
const EDGE = 16

/** Whether an element shows whole between the top of the screen and the sheet. */
function aboveSheet(element: Element, sheet: Element) {
  const { top, bottom } = element.getBoundingClientRect()
  return top >= EDGE && bottom <= sheet.getBoundingClientRect().top
}

/** Scrolls a scroller just enough to bring an element inside it to its top. */
function scrollToTop(scroller: Element, element: Element) {
  scroller.scrollTop +=
    element.getBoundingClientRect().top - scroller.getBoundingClientRect().top
}

// In a field, Mod+Z would undo the browser's own typing there, which the
// block already shows, or a keystroke in another field, so it goes to the
// editor's history instead.
const historyKey = (event: KeyboardEvent) => {
  if (event.altKey || event.nativeEvent.isComposing) return null
  if (!(isMacOS() ? event.metaKey : event.ctrlKey)) return null
  const key = event.key.toLowerCase()
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  return key === 'y' && !isMacOS() ? 'redo' : null
}

function scrollNearTop(element: Element) {
  const document = element.ownerDocument
  const view = document.defaultView ?? window
  const target = view.innerHeight * 0.2
  let left = element.getBoundingClientRect().top - target
  // Below the sheet's top is out of sight; above the target is fine, short of
  // the edge, where the block sheet's scroll leaves it.
  if (left < 0 && element.getBoundingClientRect().top >= EDGE) return
  const scrollers: Element[] = []
  for (let at = element.parentElement; at; at = at.parentElement) {
    const { overflowY } = view.getComputedStyle(at)
    if (overflowY === 'auto' || overflowY === 'scroll') scrollers.push(at)
  }
  if (document.scrollingElement) scrollers.push(document.scrollingElement)
  for (const scroller of scrollers) {
    if (Math.abs(left) < 1) return
    const before = scroller.scrollTop
    // Instant, as a page's smooth scrolling would leave scrollTop mid-move.
    scroller.scrollTo({ top: before + left, behavior: 'instant' })
    left -= scroller.scrollTop - before
  }
}

// From here the page is wide enough to give a block room beside the drawer.
const ROOM_FROM = 1280

/**
 * Pads the editor's end by as much as the drawer covers it, so a block at
 * page width sits beside the drawer rather than under it. The editor's own
 * box, not ProseMirror's, so the selection never sees it.
 */
function makeRoomBeside(
  editor: TiptapEditor,
  drawer: HTMLElement | null,
  kept: Element | null
) {
  const root = editor.view.dom.closest<HTMLElement>('[data-slot=editor]')
  const page = root?.ownerDocument.documentElement
  const view = root?.ownerDocument.defaultView ?? window
  if (!root || !drawer || !page) return
  const covered =
    root.getBoundingClientRect().right -
    (page.clientWidth - drawer.offsetWidth) +
    DRAWER_GAP
  const before = kept?.getBoundingClientRect().top
  // The drawer is on the right whatever the direction, so the padding is too.
  // The window's width, as a page scrollbar narrows the document's.
  root.style.paddingRight =
    covered > 0 && view.innerWidth >= ROOM_FROM ? `${covered}px` : ''
  // The narrower page reflows, so what was edited goes back where it was,
  // under the pointer, rather than jumping.
  if (kept && before !== undefined) {
    const moved = kept.getBoundingClientRect().top - before
    if (moved) (page.ownerDocument.scrollingElement ?? page).scrollBy(0, moved)
  }
}

// Clear of the drawer, so a block's ring never touches its edge.
const DRAWER_GAP = 16

/** Pads the editor's end by the sheet's height, so its last block can rise above it. */
function makeRoomBelow(editor: TiptapEditor, sheet: HTMLElement | null) {
  const root = editor.view.dom.closest<HTMLElement>('[data-slot=editor]')
  if (root && sheet) root.style.paddingBottom = `${sheet.offsetHeight}px`
}

/**
 * Puts the caret after the block, so the next key types rather than
 * replacing the block a tap can't deselect on a phone.
 */
function leaveBlock(editor: TiptapEditor) {
  const { state, view } = editor
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return
  // After it, never in it: text typed in a section would take its rule.
  const from = state.doc.resolve(selection.to)
  // Text only: a block selected next, such as a second section or an image
  // first in this one, would be replaced by the next key all the same.
  const caret =
    Selection.findFrom(from, 1, true) ?? Selection.findFrom(from, -1, true)
  if (!caret) return
  view.dispatch(state.tr.setSelection(caret).setMeta('addToHistory', false))
}

const selectedNode = ({ editor }: { editor: TiptapEditor | null }) => {
  const selection = editor?.state.selection
  return selection instanceof NodeSelection ? selection : null
}

type EditorBlockSettingsProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Each block's settings, by node name. */
  blocks: Readonly<Record<string, BlockSettings>>
  /** The setting to open the way to and focus, such as the text clicked. */
  focusSetting?: string
  /** What was clicked or tapped, to keep in view. */
  focusElement?: Element | null
  /**
   * Opened from the keyboard on the selected block, so closing leaves it
   * selected; otherwise the caret goes back where it was.
   */
  keepSelected?: boolean
  /** The list item being edited, by its path, such as `cards.2`. */
  editingItem?: string | null
  onEditingItemChange?: (path: string | null) => void
  uploadImage?: UploadSettingImage
}

/**
 * The selected block's settings, from the side on a desktop and the bottom on
 * a phone. Each change shows as it's made, every close keeps them, and Undo
 * takes the visit back in one step.
 */
export function EditorBlockSettings({
  editor,
  open,
  onOpenChange,
  blocks,
  focusSetting,
  focusElement,
  keepSelected = false,
  editingItem = null,
  onEditingItemChange,
  uploadImage
}: EditorBlockSettingsProps) {
  const phone = useOnPhone()
  // Where the caret was before a block was selected, kept in step with edits.
  const caretRef = useRef<SelectionBookmark | null>(null)
  useEffect(() => {
    if (!editor) return
    const follow = ({ transaction }: { transaction: Transaction }) => {
      const { selection } = editor.state
      caretRef.current =
        selection instanceof TextSelection
          ? selection.getBookmark()
          : (caretRef.current?.map(transaction.mapping) ?? null)
    }
    editor.on('transaction', follow)
    return () => {
      editor.off('transaction', follow)
    }
  }, [editor])
  const returnFrom = (current: TiptapEditor) => {
    if (keepSelected && !phone) return
    const { state, view } = current
    if (!(state.selection instanceof NodeSelection)) return
    const caret = caretRef.current?.resolve(state.doc)
    if (caret instanceof TextSelection) {
      view.dispatch(state.tr.setSelection(caret).setMeta('addToHistory', false))
    } else {
      leaveBlock(current)
    }
  }
  const live = useLiveEdit(editor, open, (next) => {
    if (!next && editor) returnFrom(editor)
    onOpenChange(next)
  })
  const bodyRef = useRef<HTMLDivElement>(null)
  const selection = useEditorState({ editor, selector: selectedNode })
  const block = selection && blocks[selection.node.type.name]
  const from = open && block ? selection.from : null
  // In view beside the drawer, so its changes show as they're made.
  useEffect(() => {
    if (from === null || !editor) return
    const dom = editor.view.nodeDOM(from)
    if (!(dom instanceof HTMLElement)) return
    if (!phone) {
      // A frame on, once the room made beside the drawer has reflowed the
      // page, and only if it's out of view.
      const frame = requestAnimationFrame(() =>
        dom.scrollIntoView({ block: 'nearest' })
      )
      return () => cancelAnimationFrame(frame)
    }
    // Never through the block's own style: ProseMirror reads a change there
    // as an edit and drops the selection, closing the drawer.
    scrollNearTop(
      focusElement && dom.contains(focusElement) ? focusElement : dom
    )
  }, [editor, from, phone, focusElement])
  // The block the room around the drawer was last made for.
  const roomRef = useRef<number | null>(null)
  useEffect(() => {
    if (!open || !editor) return
    return () => {
      roomRef.current = null
      const root = editor.view.dom.closest<HTMLElement>('[data-slot=editor]')
      if (root) {
        root.style.paddingRight = ''
        root.style.paddingBottom = ''
      }
    }
  }, [editor, open])
  // A phone's sheet starts at the item tapped, scrolled to rather than
  // focused, so the keyboard stays down.
  useEffect(() => {
    if (!phone || from === null || !focusSetting) return
    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current
      const field = body?.querySelector(
        `[data-setting="${CSS.escape(focusSetting)}"]`
      )
      if (body && field)
        scrollToTop(body, field.closest('[data-item]') ?? field)
    })
    return () => cancelAnimationFrame(frame)
  }, [phone, from, focusSetting])
  const attrs = selection?.node.attrs
  // The item being edited stays above the sheet as it opens, is added, or
  // grows as it's typed in, moving the page only once it's out of sight.
  useEffect(() => {
    if (!phone || from === null || !editingItem || !editor || !block) return
    const [name = '', index] = editingItem.split('.')
    const setting = block.settings.find((each) => each.name === name)
    const items = attrs?.[name]
    if (setting?.type !== 'list' || !Array.isArray(items)) return
    const frame = requestAnimationFrame(() => {
      const dom = editor.view.nodeDOM(from)
      const sheet = bodyRef.current?.closest('[role=dialog]')
      const element =
        dom instanceof Element
          ? itemElement(dom, items, Number(index), setting.itemLabel)
          : null
      if (element && sheet && !aboveSheet(element, sheet)) {
        scrollNearTop(element)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [phone, from, editingItem, editor, block, attrs])
  const lost = open && !block
  // Its block went, such as with a new value, so it mustn't reopen on the next.
  useEffect(() => {
    if (lost) onOpenChange(false)
  }, [lost, onOpenChange])
  if (!editor || !selection || !block) return null
  const finalFocus = () => {
    focusEditor(editor)
    return false
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const direction = historyKey(event)
    if (!direction) return
    event.preventDefault()
    live.history(direction)
  }
  const onEditItem = (path: string, editing: boolean) => {
    if (editing) onEditingItemChange?.(path)
    else if (editingItem === path) onEditingItemChange?.(null)
  }
  const content = (
    <>
      <Drawer.Header className='flex items-center justify-between gap-2'>
        <div className='grid gap-0.5'>
          <Drawer.Title>{block.label} settings</Drawer.Title>
          {/* Nothing waits on a save, so it says how to take changes back. */}
          <Drawer.Description className='text-sm text-subtle'>
            Changes apply as you go. Undo puts them back.
          </Drawer.Description>
        </div>
        <Button size='sm' emphasis='strong' intent='accent' onClick={live.done}>
          Done
        </Button>
      </Drawer.Header>
      <Drawer.Body ref={bodyRef} className='pb-6'>
        <SettingsForm
          key={selection.from}
          {...block}
          attrs={selection.node.attrs}
          live={live}
          onDone={live.done}
          focusPath={focusSetting}
          onEditItem={onEditItem}
          uploadImage={uploadImage}
        />
      </Drawer.Body>
    </>
  )
  return (
    <Drawer
      open={open}
      onOpenChange={live.onOpenChange}
      side={phone ? 'bottom' : 'right'}
      // The block shows its changes as they're made, so nothing covers it,
      // and the page stays usable, but Tab stays in the drawer.
      emphasis='subtler'
      modal='trap-focus'
    >
      {phone ? (
        // Under half a phone's height, so the block shows above it.
        <Drawer.Content
          data-editor-popup=''
          // Once it's there to measure, which can be after the effect that
          // scrolls, so the block scrolls up again into the room it makes.
          ref={(sheet: HTMLDivElement | null) => {
            // A new ref each render; the room is made once per block opened,
            // so typing never scrolls the page back.
            if (!sheet || roomRef.current === selection.from) return
            roomRef.current = selection.from
            makeRoomBelow(editor, sheet)
            const block = editor.view.nodeDOM(selection.from)
            const target =
              focusElement &&
              block instanceof Element &&
              block.contains(focusElement)
                ? focusElement
                : block
            if (target instanceof Element) scrollNearTop(target)
          }}
          size='fit'
          className='max-h-[50dvh]'
          onKeyDown={onKeyDown}
          // The sheet itself, so the keyboard doesn't cover the block.
          initialFocus={() =>
            bodyRef.current?.closest<HTMLElement>('[role=dialog]')
          }
          finalFocus={finalFocus}
        >
          {content}
        </Drawer.Content>
      ) : (
        // No backdrop, so a click on the page lands there, keeping the edits.
        <Drawer.Portal>
          <Drawer.Viewport className='pointer-events-none'>
            <Drawer.Popup
              data-editor-popup=''
              // Once it's there to measure, before its block scrolls in.
              ref={(popup) => {
                if (popup && roomRef.current !== selection.from) {
                  roomRef.current = selection.from
                  makeRoomBeside(
                    editor,
                    popup,
                    focusElement ??
                      (editor.view.nodeDOM(selection.from) as Element | null)
                  )
                }
              }}
              size='sm'
              className='pointer-events-auto'
              onKeyDown={onKeyDown}
              // The first setting, as its title takes none.
              initialFocus={() =>
                bodyRef.current?.querySelector<HTMLElement>(
                  focusSetting
                    ? `[data-setting="${CSS.escape(focusSetting)}"]`
                    : 'input:not([type=hidden]), textarea, button'
                )
              }
              finalFocus={finalFocus}
            >
              {content}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      )}
    </Drawer>
  )
}
