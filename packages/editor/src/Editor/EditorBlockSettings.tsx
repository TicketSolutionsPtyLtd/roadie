'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import { NodeSelection, Selection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Drawer } from '@oztix/roadie-components/drawer'

import type { EditorSetting } from '../extensions'
import { SettingField, type UploadSettingImage } from './EditorSettingFields'
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
  start: Attrs
  apply: LiveEdit['apply']
  onDone: () => void
  focusPath?: string
  uploadImage?: UploadSettingImage
}

function SettingsForm({
  settings,
  start,
  apply,
  onDone,
  focusPath,
  uploadImage
}: SettingsFormProps) {
  const [attrs, setAttrs] = useState(start)
  const set = (change: Attrs) => {
    setAttrs((current) => ({ ...current, ...change }))
    apply(setSelectedAttrs(change))
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
            onValueChange={(value) => set({ [setting.name]: value })}
            onDone={onDone}
            path={setting.name}
            focusPath={focusPath}
            uploadImage={uploadImage}
          />
        )
      )}
    </div>
  )
}

/**
 * Brings a block near the top, a fifth of the screen down, clear of a sticky
 * bar above it and of the sheet below. Each scroller from the block out takes
 * what's left of that fifth, as only one may have room to give.
 */
function scrollNearTop(block: HTMLElement) {
  const document = block.ownerDocument
  const view = document.defaultView ?? window
  // Instant, as a page's smooth scrolling would leave each scrollTop read
  // mid-move, and the room taken from it wrong.
  block.scrollIntoView({ block: 'start', behavior: 'instant' })
  let left = view.innerHeight * 0.2
  const scrollers: Element[] = []
  for (let at = block.parentElement; at; at = at.parentElement) {
    const { overflowY } = view.getComputedStyle(at)
    if (overflowY === 'auto' || overflowY === 'scroll') scrollers.push(at)
  }
  if (document.scrollingElement) scrollers.push(document.scrollingElement)
  for (const scroller of scrollers) {
    if (left <= 0) return
    const before = scroller.scrollTop
    scroller.scrollTo({ top: before - left, behavior: 'instant' })
    left -= before - scroller.scrollTop
  }
}

// From here the page is wide enough to give a block room beside the drawer.
const ROOM_FROM = 1280

/**
 * Pads the editor's end by as much as the drawer covers it, so a block at
 * page width sits beside the drawer rather than under it. The editor's own
 * box, not ProseMirror's, so the selection never sees it.
 */
function makeRoomBeside(editor: TiptapEditor, drawer: HTMLElement | null) {
  const root = editor.view.dom.closest<HTMLElement>('[data-slot=editor]')
  const page = root?.ownerDocument.documentElement
  const view = root?.ownerDocument.defaultView ?? window
  // The window's width, as a page scrollbar narrows the document's.
  if (!root || !drawer || !page) return
  const covered =
    root.getBoundingClientRect().right - (page.clientWidth - drawer.offsetWidth)
  // The drawer is on the right whatever the direction, so the padding is too.
  root.style.paddingRight =
    covered > 0 && view.innerWidth >= ROOM_FROM ? `${covered}px` : ''
}

/**
 * Puts the caret in the block, or after an atom, so the next key types rather
 * than replacing the block a tap can't deselect on a phone.
 */
function leaveBlock(editor: TiptapEditor) {
  const { state, view } = editor
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return
  const from = state.doc.resolve(
    selection.node.isAtom ? selection.to : selection.from + 1
  )
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
  uploadImage?: UploadSettingImage
}

/**
 * The selected block's settings, from the side on a desktop and the bottom on
 * a phone. Each change shows as it's made; Escape puts the block back.
 */
export function EditorBlockSettings({
  editor,
  open,
  onOpenChange,
  blocks,
  focusSetting,
  uploadImage
}: EditorBlockSettingsProps) {
  const phone = useOnPhone()
  const live = useLiveEdit(editor, open, (next) => {
    if (!next && editor) leaveBlock(editor)
    onOpenChange(next)
  })
  const bodyRef = useRef<HTMLDivElement>(null)
  // Escape puts the block back as one step to undo, so Redo brings the edits
  // back rather than losing them.
  const onDrawerOpenChange: typeof live.onOpenChange = (next, details) => {
    if (next || details.reason !== 'escape-key' || !editor || !live.edited()) {
      live.onOpenChange(next, details)
      return
    }
    live.done()
    editor.commands.undo()
    leaveBlock(editor)
  }
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
      // page, which can move the block.
      const frame = requestAnimationFrame(() =>
        dom.scrollIntoView({ block: 'nearest' })
      )
      return () => cancelAnimationFrame(frame)
    }
    // Never through the block's own style: ProseMirror reads a change there
    // as an edit and drops the selection, closing the drawer.
    scrollNearTop(dom)
  }, [editor, from, phone])
  useEffect(() => {
    if (!open || !editor) return
    return () => {
      const root = editor.view.dom.closest<HTMLElement>('[data-slot=editor]')
      if (root) root.style.paddingRight = ''
    }
  }, [editor, open])
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
  const content = (
    <>
      <Drawer.Header className='flex items-center justify-between gap-2'>
        <div className='grid gap-0.5'>
          <Drawer.Title>{block.label} settings</Drawer.Title>
          {/* So Escape's revert never surprises: it says what it does. */}
          <Drawer.Description className='text-sm text-subtle'>
            {phone
              ? 'Changes apply as you go.'
              : 'Changes apply as you go. Esc puts them back.'}
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
          start={selection.node.attrs}
          apply={live.apply}
          onDone={live.done}
          focusPath={focusSetting}
          uploadImage={uploadImage}
        />
      </Drawer.Body>
    </>
  )
  return (
    <Drawer
      open={open}
      onOpenChange={onDrawerOpenChange}
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
          size='fit'
          className='max-h-[50dvh]'
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
                if (popup) makeRoomBeside(editor, popup)
              }}
              size='sm'
              className='pointer-events-auto'
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
