'use client'

import type { Transaction } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Field } from '@oztix/roadie-components/field'
import { cn } from '@oztix/roadie-core/utils'

/** Sets the doc's preheader, which `setContent` leaves as it was. */
export function withPreheader(tr: Transaction, preheader: unknown) {
  const next =
    typeof preheader === 'string' && preheader !== '' ? preheader : undefined
  if (tr.doc.attrs.preheader === next) return tr
  return tr.setDocAttribute('preheader', next)
}

type EditorPreheaderProps = {
  editor: TiptapEditor
  className?: string
}

/**
 * The email's preheader, the line inboxes show after the subject. It's the
 * email's, not a block's, so it sits above the canvas.
 */
export function EditorPreheader({ editor, className }: EditorPreheaderProps) {
  const { preheader, editable } = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      preheader: String(current.state.doc.attrs.preheader ?? ''),
      editable: current.isEditable
    })
  })
  // The label sits beside the field where there's room, and above it on a
  // phone, so the field keeps its width.
  return (
    <div className={cn('@container mx-auto w-full max-w-[600px]', className)}>
      <Field
        data-slot='editor-preheader'
        className='items-center gap-x-3 gap-y-1 @min-[30rem]:grid-cols-[auto_minmax(0,1fr)]'
      >
        <Field.Label className='text-sm text-subtle'>Preview text</Field.Label>
        <Field.Input
          size='sm'
          emphasis='subtle'
          value={preheader}
          readOnly={!editable}
          placeholder='Shown after the subject in the inbox'
          onChange={(event) => {
            const { state, view } = editor
            // Its own field, so typing here is undone here, not in the email.
            view.dispatch(
              withPreheader(state.tr, event.target.value).setMeta(
                'addToHistory',
                false
              )
            )
          }}
        />
        <Field.HelperText className='text-xs @min-[30rem]:col-start-2'>
          About 40 to 90 characters show.
        </Field.HelperText>
      </Field>
    </div>
  )
}
