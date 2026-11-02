'use client'

import { type RefObject, useRef, useState } from 'react'

import { NodeSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Popover } from '@oztix/roadie-components/popover'

import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

type AltTextFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  onDone: () => void
}

function imageAlt(editor: TiptapEditor) {
  const alt: unknown = editor.getAttributes('image').alt
  return typeof alt === 'string' ? alt : ''
}

/** Applies the alt text as it's typed. */
function AltTextForm({ editor, inputRef, apply, onDone }: AltTextFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [saved] = useState(() => imageAlt(editor))
  const [typed, setTyped] = useState(saved)

  const save = () => {
    onDone()
    return true
  }

  return (
    <EditorPopoverForm
      label='Alt text'
      inputRef={inputRef}
      placeholder='Describe the image'
      value={typed}
      onValueChange={(value) => {
        setTyped(value)
        apply(setSelectedAttrs({ alt: value.trim() }))
      }}
      submitLabel='Save alt text'
      onSubmit={save}
      // Saving it empty clears alt text the image had.
      canSubmit={typed.trim() !== '' || saved !== ''}
    />
  )
}

type EditorAltTextPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Edits the alt text of the selected image, anchored to it. Escape puts it back. */
export function EditorAltTextPopover({
  editor,
  open,
  onOpenChange
}: EditorAltTextPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const live = useLiveEdit(editor, open, onOpenChange)
  if (!editor) return null
  const { selection } = editor.state
  const isImage =
    selection instanceof NodeSelection && selection.node.type.name === 'image'
  const image = isImage ? editor.view.nodeDOM(selection.from) : null
  if (!(image instanceof HTMLElement)) return null
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className={EDITOR_POPOVER_CLASS}
        positionerProps={{ anchor: image }}
        initialFocus={inputRef}
        finalFocus={() => {
          editor.commands.focus()
          return false
        }}
      >
        <AltTextForm
          editor={editor}
          inputRef={inputRef}
          apply={live.apply}
          onDone={live.done}
        />
      </Popover.Content>
    </Popover>
  )
}
