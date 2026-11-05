'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import { NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
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
        value={textOf(value)}
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
          value={textOf(value)}
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
          />
        )
      )}
    </div>
  )
}

const shownWith =
  (attrs: Attrs) => (setting: EditorSetting | EditorOwnSetting) =>
    setting.type === 'own' || (setting.available?.(attrs) ?? true)

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
  const live = useLiveEdit(editor, open, onOpenChange)
  const bodyRef = useRef<HTMLDivElement>(null)
  const selection = useEditorState({ editor, selector: selectedNode })
  const block = selection && blocks[selection.node.type.name]
  const from = open && block ? selection.from : null
  // In view beside the drawer, so its changes show as they're made.
  useEffect(() => {
    if (from === null || !editor) return
    const dom = editor.view.nodeDOM(from)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'nearest' })
  }, [editor, from])
  const lost = open && !block
  // Its block went, such as with a new value, so it mustn't reopen on the next.
  useEffect(() => {
    if (lost) onOpenChange(false)
  }, [lost, onOpenChange])
  if (!editor || !selection || !block) return null
  return (
    <Drawer
      open={open}
      onOpenChange={live.onOpenChange}
      side={phone ? 'bottom' : 'right'}
      // The block shows its changes as they're made, so nothing covers it.
      emphasis='subtler'
    >
      <Drawer.Content
        size={phone ? 'fit' : 'sm'}
        // The first setting, as its title takes none. On a phone the drawer
        // itself, so the keyboard doesn't cover the block.
        initialFocus={() =>
          phone
            ? bodyRef.current?.closest<HTMLElement>('[role=dialog]')
            : bodyRef.current?.querySelector<HTMLElement>(
                'input:not([type=hidden]), textarea, button'
              )
        }
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        <Drawer.Header>
          <Drawer.Title>{block.label} settings</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body ref={bodyRef} className='pb-2'>
          <SettingsForm
            key={selection.from}
            {...block}
            start={selection.node.attrs}
            apply={live.apply}
            onDone={live.done}
          />
        </Drawer.Body>
        <Drawer.Footer>
          {/* A phone has no Escape, so this puts the block back too. */}
          <Drawer.Close render={<Button>Cancel</Button>} />
          <Button emphasis='strong' intent='accent' onClick={live.done}>
            Done
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
