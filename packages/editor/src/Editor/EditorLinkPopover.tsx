'use client'

import { type RefObject, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Popover } from '@oztix/roadie-components/popover'

import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { focusEditor } from './focusEditor'

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i
const BARE_DOMAIN = /^[^\s/?#:@]+\.[a-z]{2,}(?:[/?#:]|$)/i

/** Adds `https://` to a bare domain, such as `oztix.com.au/events`. */
export function toHref(typed: string) {
  const trimmed = typed.trim()
  return !HAS_SCHEME.test(trimmed) && BARE_DOMAIN.test(trimmed)
    ? `https://${trimmed}`
    : trimmed
}

function isLinkable(editor: TiptapEditor, href: string) {
  return (
    /^\S+$/.test(href) && URL.canParse(href) && editor.can().setLink({ href })
  )
}

type LinkFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  onDone: () => void
}

function linkHref(editor: TiptapEditor) {
  const href: unknown = editor.getAttributes('link').href
  return typeof href === 'string' ? href : undefined
}

function LinkForm({ editor, inputRef, onDone }: LinkFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [current] = useState(() => linkHref(editor))
  const editing = current !== undefined
  const [typed, setTyped] = useState(current ?? '')
  const [refused, setRefused] = useState(false)

  const save = () => {
    const href = toHref(typed)
    if (!isLinkable(editor, href)) {
      setRefused(true)
      return false
    }
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editing) {
      chain
        .insertContent({
          type: 'text',
          text: href,
          marks: [{ type: 'link', attrs: { href } }]
        })
        .run()
    } else {
      chain.setLink({ href }).run()
    }
    onDone()
    return true
  }

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    onDone()
  }

  return (
    <EditorPopoverForm
      label='Link'
      inputRef={inputRef}
      type='url'
      inputMode='url'
      placeholder='Paste a link'
      value={typed}
      onValueChange={(value) => {
        setTyped(value)
        setRefused(false)
      }}
      submitLabel='Save link'
      onSubmit={save}
      invalid={refused}
      error='Enter a web address, such as oztix.com.au.'
      remove={editing ? { label: 'Remove link', onClick: remove } : undefined}
    />
  )
}

type EditorLinkPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Adds, changes or removes the link on the selection, anchored to it. */
export function EditorLinkPopover({
  editor,
  open,
  onOpenChange
}: EditorLinkPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const { from, to } = editor.state.selection
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to)
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className={EDITOR_POPOVER_CLASS}
        positionerProps={{ anchor }}
        initialFocus={inputRef}
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        <LinkForm
          editor={editor}
          inputRef={inputRef}
          onDone={() => onOpenChange(false)}
        />
      </Popover.Content>
    </Popover>
  )
}
