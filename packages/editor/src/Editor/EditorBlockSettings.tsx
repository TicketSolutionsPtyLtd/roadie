'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import { NodeSelection, Selection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Drawer } from '@oztix/roadie-components/drawer'
import { Field } from '@oztix/roadie-components/field'
import { Select } from '@oztix/roadie-components/select'

import type { EditorSetting } from '../extensions'
import { EditorChoice } from './EditorChoice'
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

// Up to three fit side by side in the drawer.
const MAX_BUTTONS = 3

const textOf = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

type SettingFieldProps = {
  setting: EditorSetting
  value: unknown
  onValueChange: (value: string) => void
  onDone: () => void
}

function SettingField({
  setting,
  value,
  onValueChange,
  onDone
}: SettingFieldProps) {
  if (setting.type === 'choice' && setting.options.length <= MAX_BUTTONS) {
    return (
      <EditorChoice
        legend={setting.label}
        choices={setting.options}
        value={textOf(value ?? setting.defaultValue)}
        onValueChange={onValueChange}
        helperText={setting.helperText}
      />
    )
  }
  return (
    <Field>
      <Field.Label>{setting.label}</Field.Label>
      {setting.type === 'choice' ? (
        <Select
          value={textOf(value ?? setting.defaultValue)}
          onValueChange={(chosen) => {
            if (typeof chosen === 'string') onValueChange(chosen)
          }}
          items={setting.options}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {setting.options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      ) : setting.multiline ? (
        <Field.Textarea
          value={textOf(value)}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : (
        <Field.Input
          value={textOf(value)}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            // The Enter that picks an IME candidate only ends the composition.
            const composing =
              event.nativeEvent.isComposing || event.keyCode === 229
            if (event.key !== 'Enter' || composing) return
            event.preventDefault()
            onDone()
          }}
        />
      )}
      {setting.helperText ? (
        <Field.HelperText>{setting.helperText}</Field.HelperText>
      ) : null}
    </Field>
  )
}

type SettingsFormProps = BlockSettings & {
  start: Attrs
  apply: LiveEdit['apply']
  onDone: () => void
}

function SettingsForm({ settings, start, apply, onDone }: SettingsFormProps) {
  const [attrs, setAttrs] = useState(start)
  const set = (change: Attrs) => {
    setAttrs((current) => ({ ...current, ...change }))
    apply(setSelectedAttrs(change))
  }
  return (
    <div className='grid content-start gap-4'>
      {settings.map((setting) =>
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
  block.scrollIntoView({ block: 'start' })
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
    scroller.scrollTop = before - left
    left -= before - scroller.scrollTop
  }
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
}

/**
 * The selected block's settings, from the side on a desktop and the bottom on
 * a phone. Each change shows as it's made; Escape puts the block back.
 */
export function EditorBlockSettings({
  editor,
  open,
  onOpenChange,
  blocks
}: EditorBlockSettingsProps) {
  const phone = useOnPhone()
  const live = useLiveEdit(editor, open, (next) => {
    if (!next && editor) leaveBlock(editor)
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
      dom.scrollIntoView({ block: 'nearest' })
      return
    }
    // Never through the block's own style: ProseMirror reads a change there
    // as an edit and drops the selection, closing the drawer.
    scrollNearTop(dom)
  }, [editor, from, phone])
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
      <Drawer.Header>
        <Drawer.Title>{block.label} settings</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body ref={bodyRef} className='pb-6'>
        <SettingsForm
          key={selection.from}
          {...block}
          start={selection.node.attrs}
          apply={live.apply}
          onDone={live.done}
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
              size='sm'
              className='pointer-events-auto'
              // The first setting, as its title takes none.
              initialFocus={() =>
                bodyRef.current?.querySelector<HTMLElement>(
                  'input:not([type=hidden]), textarea, button'
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
