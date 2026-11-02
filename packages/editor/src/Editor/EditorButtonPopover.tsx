'use client'

import { type ReactNode, type RefObject, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Field } from '@oztix/roadie-components/field'
import { Fieldset } from '@oztix/roadie-components/fieldset'
import { Popover } from '@oztix/roadie-components/popover'
import { Select } from '@oztix/roadie-components/select'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

import {
  type ButtonAlign,
  type ButtonLook,
  buttonLook,
  isEmailHref
} from '../schema/emailAttrs'
import { toHref, useLinkVariables } from './EditorLinkPopover'
import { selectedNodeType } from './EditorNodeToolbar'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { buttonBlock, insertBlock } from './emailEditing'
import { focusEditor } from './focusEditor'

type ButtonFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  onDone: () => void
}

function buttonHref(editor: TiptapEditor) {
  if (selectedNodeType(editor.state) !== 'button') return undefined
  const href: unknown = editor.getAttributes('button').href
  return typeof href === 'string' ? href : ''
}

const REFUSED =
  'Enter a full web address, such as oztix.com.au, or a mailto: or tel: link.'

function AddButtonForm({ editor, inputRef, onDone }: ButtonFormProps) {
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState(false)

  const save = () => {
    const href = toHref(typed)
    if (!isEmailHref(href)) {
      setRefused(true)
      return false
    }
    editor
      .chain()
      .focus()
      .command(insertBlock(buttonBlock(href)))
      .run()
    onDone()
    return true
  }

  return (
    <EditorPopoverForm
      label='Button link'
      inputRef={inputRef}
      type='url'
      inputMode='url'
      placeholder='Paste a link'
      value={typed}
      onValueChange={(value) => {
        setTyped(value)
        setRefused(false)
      }}
      submitLabel='Add button'
      onSubmit={save}
      invalid={refused}
      error={REFUSED}
    />
  )
}

type Choice<Value extends string> = { value: Value; label: string }

type ChoiceProps<Value extends string> = {
  legend: string
  choices: readonly Choice<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  disabled?: boolean
  helperText?: ReactNode
}

function ButtonChoice<Value extends string>({
  legend,
  choices,
  value,
  onValueChange,
  disabled,
  helperText
}: ChoiceProps<Value>) {
  return (
    <Fieldset className='grid gap-1.5 [&>*+*]:mt-0' disabled={disabled}>
      {/* A label's size, as the Link field's, not a section's. */}
      <Fieldset.Legend className='text-sm font-medium text-normal'>
        {legend}
      </Fieldset.Legend>
      <ToggleGroup
        value={[value]}
        // Pressing the chosen item again would leave none, so it's ignored.
        onValueChange={([chosen]) => {
          if (chosen) onValueChange(chosen as Value)
        }}
        disabled={disabled}
        className='w-full'
      >
        {choices.map((choice) => (
          <ToggleGroup.Item
            key={choice.value}
            value={choice.value}
            className='flex-1'
          >
            {choice.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
      {helperText ? (
        <Fieldset.HelperText>{helperText}</Fieldset.HelperText>
      ) : null}
    </Fieldset>
  )
}

const EMPHASES = [
  { value: 'strong', label: 'Filled' },
  { value: 'normal', label: 'Outline' }
] as const

const WIDTHS = [
  { value: 'fit', label: 'Fit label' },
  { value: 'full', label: 'Full width' }
] as const

const ALIGNS: readonly Choice<ButtonAlign>[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' }
]

type SettingsFormProps = ButtonFormProps & {
  href: string
  variable?: string
  look: ButtonLook
}

// Select values, kept apart from any variable's key.
const WEB_ADDRESS = 'web'
const linkTo = (key: string) => `variable:${key}`

function ButtonSettingsForm({
  editor,
  inputRef,
  href,
  variable,
  look,
  onDone
}: SettingsFormProps) {
  const variables = useLinkVariables(editor)
  const [linksTo, setLinksTo] = useState(
    variable ? linkTo(variable) : WEB_ADDRESS
  )
  const linked = variables.find(({ key }) => linkTo(key) === linksTo)
  const [typed, setTyped] = useState(href)
  const [refused, setRefused] = useState(false)
  const [emphasis, setEmphasis] = useState(look.emphasis ?? 'strong')
  const [width, setWidth] = useState(look.fullWidth ? 'full' : 'fit')
  const [align, setAlign] = useState<ButtonAlign>(look.align ?? 'left')

  return (
    <form
      noValidate
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        const saved = toHref(typed)
        if (!linked && !isEmailHref(saved)) {
          setRefused(true)
          inputRef.current?.focus()
          return
        }
        const full = width === 'full'
        // Undefined clears an attr, so the saved button keeps only what isn't
        // the default.
        editor
          .chain()
          .focus()
          .updateAttributes('button', {
            href: linked ? undefined : saved,
            variable: linked?.key,
            emphasis: emphasis === 'normal' ? emphasis : undefined,
            fullWidth: full || undefined,
            align: !full && align !== 'left' ? align : undefined
          })
          .run()
        onDone()
      }}
    >
      {variables.length > 0 ? (
        <Field>
          <Field.Label>Links to</Field.Label>
          <Select
            value={linksTo}
            onValueChange={(value) => {
              if (typeof value === 'string') setLinksTo(value)
            }}
            items={[
              { value: WEB_ADDRESS, label: 'A web address' },
              ...variables.map(({ key, label }) => ({
                value: linkTo(key),
                label
              }))
            ]}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={WEB_ADDRESS}>A web address</Select.Item>
              {variables.map(({ key, label }) => (
                <Select.Item key={key} value={linkTo(key)}>
                  {label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {linked ? (
            <Field.HelperText>
              The sending system fills in this link for each customer.
            </Field.HelperText>
          ) : null}
        </Field>
      ) : null}
      {linked ? null : (
        <Field invalid={refused}>
          <Field.Label>Link</Field.Label>
          <Field.Input
            ref={inputRef}
            type='url'
            inputMode='url'
            placeholder='Paste a link'
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value)
              setRefused(false)
            }}
            // Backward, so a long link shows its start, as the add form's does.
            onFocus={(event) => {
              if (event.currentTarget.value !== href) return
              const input = event.currentTarget
              input.setSelectionRange(0, input.value.length, 'backward')
            }}
          />
          <Field.ErrorText>{REFUSED}</Field.ErrorText>
        </Field>
      )}
      <ButtonChoice
        legend='Style'
        choices={EMPHASES}
        value={emphasis}
        onValueChange={setEmphasis}
      />
      <ButtonChoice
        legend='Width'
        choices={WIDTHS}
        value={width}
        onValueChange={setWidth}
      />
      <ButtonChoice
        legend='Align'
        choices={ALIGNS}
        value={align}
        onValueChange={setAlign}
        disabled={width === 'full'}
        helperText={
          width === 'full' ? 'A full-width button spans its column.' : null
        }
      />
      <div className='flex justify-end gap-2'>
        <Popover.Close render={<Button emphasis='subtler'>Cancel</Button>} />
        <Button type='submit' intent='accent' emphasis='strong'>
          Save
        </Button>
      </div>
    </form>
  )
}

function ButtonForm({ editor, inputRef, onDone }: ButtonFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [current] = useState(() => {
    const href = buttonHref(editor)
    if (href === undefined) return undefined
    const attrs = editor.getAttributes('button')
    const variable: unknown = attrs.variable
    return {
      href,
      variable: typeof variable === 'string' ? variable : undefined,
      look: buttonLook(attrs)
    }
  })
  if (!current) {
    return <AddButtonForm editor={editor} inputRef={inputRef} onDone={onDone} />
  }
  return (
    <ButtonSettingsForm
      editor={editor}
      inputRef={inputRef}
      href={current.href}
      variable={current.variable}
      look={current.look}
      onDone={onDone}
    />
  )
}

type EditorButtonPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Adds a button from its link, or edits the selected button's link, style,
 * width and alignment.
 */
export function EditorButtonPopover({
  editor,
  open,
  onOpenChange
}: EditorButtonPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const editing = selectedNodeType(editor.state) === 'button'
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
  }
  const form = (
    <ButtonForm
      key={editing ? `edit-${from}` : 'add'}
      editor={editor}
      inputRef={inputRef}
      onDone={() => onOpenChange(false)}
    />
  )
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className={
          editing ? 'w-80 max-w-(--available-width)' : EDITOR_POPOVER_CLASS
        }
        positionerProps={{ anchor }}
        initialFocus={inputRef}
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        {editing ? (
          <>
            <Popover.Header>
              <Popover.Title>Button settings</Popover.Title>
            </Popover.Header>
            {form}
          </>
        ) : (
          form
        )}
      </Popover.Content>
    </Popover>
  )
}
