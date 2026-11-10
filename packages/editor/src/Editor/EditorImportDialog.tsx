'use client'

import { useDeferredValue, useRef, useState } from 'react'

import { FileArrowUpIcon } from '@phosphor-icons/react'
import type { JSONContent } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Callout } from '@oztix/roadie-components/callout'
import { Dialog } from '@oztix/roadie-components/dialog'
import { Field } from '@oztix/roadie-components/field'
import { RadioGroup } from '@oztix/roadie-components/radio-group'

import {
  type EditorVariable,
  type EmbedProvider,
  emailSourceFormat,
  importEmail
} from '../schema'
import { withPreheader } from './EditorPreheader'
import { importLosses } from './importLosses'

type Placement = 'replace' | 'add'

/** An import the editor opened, numbered so each opening starts afresh. */
export type ImportRequest = { open: boolean; source: string; count: number }

export type EditorImportDialogProps = {
  editor: TiptapEditor | null
  request: ImportRequest
  onClose: () => void
  variables: readonly EditorVariable[] | undefined
  embedProviders: readonly EmbedProvider[]
}

// After the block at the caret, as a layout can't sit inside another block,
// or in place of the empty paragraph the caret is in.
function addAtCaret(editor: TiptapEditor, content: JSONContent[]) {
  const { selection } = editor.state
  const { $from } = selection
  if ($from.depth === 0) {
    editor.chain().focus().insertContentAt(selection.to, content).run()
    return
  }
  const block = $from.node(1)
  const isBlankLine =
    block.type.name === 'paragraph' && block.content.size === 0
  const at = isBlankLine
    ? { from: $from.before(1), to: $from.after(1) }
    : $from.after(1)
  editor.chain().focus().insertContentAt(at, content).run()
}

type ImportFormProps = Omit<EditorImportDialogProps, 'request' | 'editor'> & {
  editor: TiptapEditor
  initialSource: string
}

function ImportForm({
  editor,
  initialSource,
  onClose,
  variables,
  embedProviders
}: ImportFormProps) {
  const [source, setSource] = useState(initialSource)
  const [placement, setPlacement] = useState<Placement>(
    editor.isEmpty ? 'replace' : 'add'
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const read = useDeferredValue(source)
  const hasSource = read.trim() !== ''
  const imported = hasSource
    ? importEmail(read, { variables, embedProviders })
    : null
  const losses = imported ? importLosses(imported) : []
  const format = emailSourceFormat(read) === 'mjml' ? 'MJML' : 'HTML'

  function confirm() {
    const { doc } = importEmail(source, { variables, embedProviders }).value
    if (placement === 'replace') {
      editor
        .chain()
        .setContent(doc)
        .command(({ tr }) => {
          // The email's own preheader stays unless the source brings one.
          if (doc.attrs?.preheader) withPreheader(tr, doc.attrs.preheader)
          // The doc's start would select a leading image, not a place to type.
          const firstText = Selection.findFrom(tr.doc.resolve(0), 1, true)
          if (firstText) tr.setSelection(firstText)
          return true
        })
        .focus()
        .run()
    } else {
      addAtCaret(editor, doc.content ?? [])
      // An email with no preheader of its own takes the source's.
      if (doc.attrs?.preheader && !editor.state.doc.attrs.preheader) {
        editor.view.dispatch(
          withPreheader(editor.state.tr, doc.attrs.preheader)
        )
      }
    }
    onClose()
  }

  return (
    <form
      className='grid gap-6'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        confirm()
      }}
    >
      <Dialog.Header>
        <Dialog.Title>Import HTML or MJML</Dialog.Title>
        <Dialog.Description>
          Paste an email’s source, whole or in part, or choose an .html or .mjml
          file. Its text, links, images, buttons, and columns come across, in
          the email’s own style.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Body className='gap-4'>
        <Field>
          <Field.Label>Source</Field.Label>
          <Field.Textarea
            value={source}
            onChange={(event) => setSource(event.currentTarget.value)}
            rows={10}
            spellCheck={false}
            autoComplete='off'
            className='font-mono text-sm'
          />
          <Field.HelperText>
            {hasSource
              ? `Reading it as ${format}.`
              : 'MJML starts with <mjml>. Anything else is read as HTML.'}
          </Field.HelperText>
        </Field>
        <Button
          size='sm'
          emphasis='subtle'
          className='justify-self-start'
          onClick={() => fileRef.current?.click()}
        >
          <FileArrowUpIcon weight='bold' className='size-4' aria-hidden />
          Choose a file
        </Button>
        <input
          ref={fileRef}
          type='file'
          accept='.html,.htm,.mjml,text/html'
          hidden
          aria-label='Email file'
          onChange={(event) => {
            const [file] = event.currentTarget.files ?? []
            event.currentTarget.value = ''
            // An unreadable file leaves the source as it was.
            file?.text().then(setSource, () => {})
          }}
        />
        {losses.length > 0 ? (
          <Callout intent='warning'>
            <Callout.Icon />
            <Callout.Title>Some of it won’t come across</Callout.Title>
            <Callout.Description>
              <ul className='grid list-disc gap-1 ps-5'>
                {losses.map((loss) => (
                  <li key={loss}>{loss}</li>
                ))}
              </ul>
            </Callout.Description>
          </Callout>
        ) : null}
        {editor.isEmpty ? null : (
          <RadioGroup
            value={placement}
            onValueChange={(value) => setPlacement(value as Placement)}
          >
            <RadioGroup.Label>Put it</RadioGroup.Label>
            <RadioGroup.Item value='add' label='Below the cursor' />
            <RadioGroup.Item
              value='replace'
              label='In place of the whole email'
              description='Undo brings the email back.'
            />
          </RadioGroup>
        )}
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.Close render={<Button>Cancel</Button>} />
        <Button
          type='submit'
          intent='accent'
          emphasis='strong'
          disabled={source.trim() === ''}
        >
          Import
        </Button>
      </Dialog.Footer>
    </form>
  )
}

/** Imports an email's HTML or MJML, saying first what won't come across. */
export function EditorImportDialog({
  editor,
  request: { open, source, count },
  onClose,
  ...props
}: EditorImportDialogProps) {
  return (
    <Dialog
      open={open && editor !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Content size='lg' data-editor-popup=''>
        {editor ? (
          <ImportForm
            key={count}
            editor={editor}
            initialSource={source}
            onClose={onClose}
            {...props}
          />
        ) : null}
      </Dialog.Content>
    </Dialog>
  )
}
