'use client'

import { type RefObject, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Popover } from '@oztix/roadie-components/popover'

import { isEmailHref } from '../schema/emailAttrs'
import { toHref } from './EditorLinkPopover'
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

function ButtonForm({ editor, inputRef, onDone }: ButtonFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [current] = useState(() => buttonHref(editor))
  const [typed, setTyped] = useState(current ?? '')
  const [refused, setRefused] = useState(false)

  const save = () => {
    const href = toHref(typed)
    if (!isEmailHref(href)) {
      setRefused(true)
      return false
    }
    const chain = editor.chain().focus()
    if (current === undefined) chain.command(insertBlock(buttonBlock(href)))
    else chain.updateAttributes('button', { href })
    chain.run()
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
      submitLabel={current === undefined ? 'Add button' : 'Save link'}
      onSubmit={save}
      invalid={refused}
      error='Enter a full web address, such as oztix.com.au, or a mailto: or tel: link.'
    />
  )
}

type EditorButtonPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Sets the link of a new button, or of the button at the selection. */
export function EditorButtonPopover({
  editor,
  open,
  onOpenChange
}: EditorButtonPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
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
        <ButtonForm
          editor={editor}
          inputRef={inputRef}
          onDone={() => onOpenChange(false)}
        />
      </Popover.Content>
    </Popover>
  )
}
