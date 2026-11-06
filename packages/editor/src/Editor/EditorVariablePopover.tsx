'use client'

import { type RefObject, use, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Field } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'
import { Select } from '@oztix/roadie-components/select'

import { textVariables } from '../schema/variables'
import { EditorContext } from './EditorContext'
import { focusEditor } from './focusEditor'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

type Tag = { key: string; fallback: string }

function selectedTag(editor: TiptapEditor): Tag | undefined {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection)) return undefined
  if (selection.node.type.name !== 'variable') return undefined
  const { key, fallback } = selection.node.attrs
  return {
    key: String(key),
    fallback: typeof fallback === 'string' ? fallback : ''
  }
}

type TagFormProps = {
  tag: Tag
  fallbackRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  onDone: () => void
}

/** Applies each change as it's made. */
function TagForm({ tag, fallbackRef, apply, onDone }: TagFormProps) {
  const variables = textVariables(use(EditorContext)?.variables)
  const [key, setKey] = useState(tag.key)
  const [fallback, setFallback] = useState(tag.fallback)
  // A tag can name a key the editor no longer lists, which stays choosable.
  const listed = variables.some((variable) => variable.key === tag.key)
  const choices = listed
    ? variables
    : [...variables, { key: tag.key, label: tag.key }]

  const update = (attrs: { key?: string; fallback?: string }) =>
    apply(setSelectedAttrs(attrs))

  return (
    <form
      noValidate
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        onDone()
      }}
    >
      <Field>
        <Field.Label>Shows</Field.Label>
        <Select
          value={key}
          onValueChange={(value) => {
            if (typeof value !== 'string') return
            setKey(value)
            update({ key: value })
          }}
          items={choices.map(({ key: value, label }) => ({ value, label }))}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {choices.map(({ key: value, label }) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </Field>
      <Field>
        <Field.Label>Fallback</Field.Label>
        <Field.Input
          ref={fallbackRef}
          value={fallback}
          onChange={(event) => {
            const value = event.target.value
            setFallback(value)
            update({ fallback: value.trim() || undefined })
          }}
          // With no submit button, Enter wouldn't submit a form on its own.
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            // The Enter that picks an IME candidate only ends the composition.
            const composing =
              event.nativeEvent.isComposing || event.keyCode === 229
            if (!composing) event.currentTarget.form?.requestSubmit()
          }}
          placeholder='Leave empty to show nothing'
        />
        <Field.HelperText>
          Shown to anyone without a value, such as “friend” for a first name.
        </Field.HelperText>
      </Field>
    </form>
  )
}

type EditorVariablePopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Edits the selected merge tag: the variable it shows, and its fallback.
 * Escape keeps the changes, which undo puts back in one step.
 */
export function EditorVariablePopover({
  editor,
  open,
  onOpenChange
}: EditorVariablePopoverProps) {
  const live = useLiveEdit(editor, open, onOpenChange)
  const fallbackRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const tag = open ? selectedTag(editor) : undefined
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
  }
  return (
    <Popover open={open && Boolean(tag)} onOpenChange={live.onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className='w-80 max-w-(--available-width)'
        positionerProps={{ anchor }}
        // A tag without one needs it most, so that's where typing goes.
        initialFocus={tag?.fallback ? true : fallbackRef}
        finalFocus={() => {
          // After the tag, so typing carries on rather than replacing it.
          const { selection } = editor.state
          if (selection instanceof NodeSelection) {
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.create(editor.state.doc, selection.to)
              )
            )
          }
          focusEditor(editor)
          return false
        }}
      >
        <Popover.Header>
          <Popover.Title>Merge tag</Popover.Title>
        </Popover.Header>
        {tag ? (
          <TagForm
            key={`${from}`}
            tag={tag}
            fallbackRef={fallbackRef}
            apply={live.apply}
            onDone={live.done}
          />
        ) : null}
      </Popover.Content>
    </Popover>
  )
}
