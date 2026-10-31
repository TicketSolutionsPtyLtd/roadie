'use client'

import { use, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Field } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'
import { Select } from '@oztix/roadie-components/select'

import { EditorContext } from './EditorContext'
import { focusEditor } from './focusEditor'

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

type TagFormProps = { editor: TiptapEditor; tag: Tag; onDone: () => void }

function TagForm({ editor, tag, onDone }: TagFormProps) {
  const variables = use(EditorContext)?.variables ?? []
  const [key, setKey] = useState(tag.key)
  const [fallback, setFallback] = useState(tag.fallback)
  // A tag can name a key the editor no longer lists, which stays choosable.
  const listed = variables.some((variable) => variable.key === tag.key)
  const choices = listed
    ? variables
    : [...variables, { key: tag.key, label: tag.key }]

  return (
    <form
      noValidate
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        editor
          .chain()
          .focus()
          .updateAttributes('variable', {
            key,
            fallback: fallback.trim() || undefined
          })
          .run()
        onDone()
      }}
    >
      <Field>
        <Field.Label>Shows</Field.Label>
        <Select
          value={key}
          onValueChange={(value) => {
            if (typeof value === 'string') setKey(value)
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
          value={fallback}
          onChange={(event) => setFallback(event.target.value)}
          placeholder='Leave empty to show nothing'
        />
        <Field.HelperText>
          Shown to anyone without a value, such as “friend” for a first name.
        </Field.HelperText>
      </Field>
      <div className='flex justify-end gap-2'>
        <Popover.Close render={<Button emphasis='subtler'>Cancel</Button>} />
        <Button type='submit' intent='accent' emphasis='strong'>
          Save
        </Button>
      </div>
    </form>
  )
}

type EditorVariablePopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Edits the selected merge tag: the variable it shows, and its fallback. */
export function EditorVariablePopover({
  editor,
  open,
  onOpenChange
}: EditorVariablePopoverProps) {
  if (!editor) return null
  const tag = open ? selectedTag(editor) : undefined
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
  }
  return (
    <Popover open={open && Boolean(tag)} onOpenChange={onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className='w-80 max-w-(--available-width)'
        positionerProps={{ anchor }}
        finalFocus={() => {
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
            editor={editor}
            tag={tag}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </Popover.Content>
    </Popover>
  )
}
