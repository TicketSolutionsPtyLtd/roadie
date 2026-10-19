'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { Extension, type JSONContent, getSchema } from '@tiptap/core'
import { Placeholder } from '@tiptap/extensions'
import {
  EditorContent as TiptapContent,
  type Editor as TiptapEditor,
  useEditor,
  useEditorState
} from '@tiptap/react'

import {
  useFieldContext,
  useFieldControlError,
  useFieldInputProps
} from '@oztix/roadie-components/field'
import { cn } from '@oztix/roadie-core/utils'

import {
  CURRENT_VERSION,
  type Preset,
  createEmptyValue,
  migrate
} from '../schema'
import { basic } from '../schema/basicPreset'
import { EditorContent } from './EditorContent'
import { EditorContext } from './EditorContext'
import { EditorLinkPopover } from './EditorLinkPopover'
import type { EditorRootProps } from './EditorRoot'
import { EditorToolbarEngine } from './EditorToolbarEngine'
import { EDITOR_PRESET } from './startingValue'
import {
  EDITOR_FRAME,
  EDITOR_MIN_HEIGHT,
  EDITOR_TOOLBAR_HEIGHT,
  editorContentClass
} from './variants'

type LinkShortcutOptions = { onEditLink: () => void }

const LinkShortcut = Extension.create<LinkShortcutOptions>({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': ({ editor }) => {
        if (!editor.schema.marks.link || !editor.isEditable) return false
        this.options.onEditLink()
        return true
      }
    }
  }
})

const UNREADABLE =
  'This content couldn’t be loaded, so it can’t be edited here.'

// The editor edits only `EDITOR_PRESET`, so it loads that preset alone and
// none of the rich preset's code.
const extensions = basic
let schema: ReturnType<typeof getSchema> | undefined

// Tiptap swaps content its schema can't read for an empty document, which the
// next save would store, so the editor checks first.
function readsDoc(doc: JSONContent) {
  schema ??= getSchema(extensions)
  try {
    schema.nodeFromJSON(doc)
    return true
  } catch {
    return false
  }
}

function holdsDoc(editor: TiptapEditor, doc: JSONContent) {
  try {
    return editor.state.doc.eq(editor.schema.nodeFromJSON(doc))
  } catch {
    return false
  }
}

type FormValueProps = {
  editor: TiptapEditor | null
  name: string
  preset: Preset
  disabled: boolean
  /** Submitted in place of the editor's document, which couldn't read it. */
  unreadDoc: JSONContent | null
}

function FormValue({
  editor,
  name,
  preset,
  disabled,
  unreadDoc
}: FormValueProps) {
  const editorDoc = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.state.doc ?? null,
    equalityFn: Object.is
  })
  const doc: JSONContent | null = unreadDoc ?? editorDoc?.toJSON() ?? null
  if (!doc) return null
  return (
    <input
      type='hidden'
      data-slot='editor-value'
      name={name}
      disabled={disabled}
      value={JSON.stringify({
        version: CURRENT_VERSION,
        preset,
        doc
      })}
    />
  )
}

/** The loaded editor, which `Editor` renders in place of its skeleton. */

export function EditorEngine({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  readOnly = false,
  disabled: disabledProp = false,
  name,
  size = 'md',
  emphasis = 'normal',
  className,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: EditorRootProps) {
  const placeholderRef = useRef(placeholder)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [editingLink, setEditingLink] = useState(false)
  const field = useFieldContext()
  const fieldInput = useFieldInputProps()
  const generatedId = useId()
  const contentId = fieldInput.id ?? generatedId
  const disabled = disabledProp || Boolean(field.disabled)
  const labelledBy =
    ariaLabelledBy ?? (ariaLabel ? undefined : field.labelId || undefined)
  const describedBy = fieldInput['aria-describedby']
  const preset = EDITOR_PRESET
  const valueDoc = value && migrate(value, preset).doc
  const [defaultDoc] = useState(
    () => migrate(defaultValue ?? createEmptyValue(preset), preset).doc
  )
  const shownDoc = valueDoc ?? defaultDoc
  const unreadable = !readsDoc(shownDoc)
  const editable = !readOnly && !disabled && !unreadable
  useFieldControlError(unreadable ? UNREADABLE : null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...extensions,
      Placeholder.configure({
        placeholder: () => placeholderRef.current ?? ''
      }),
      LinkShortcut.configure({ onEditLink: () => setEditingLink(true) })
    ],
    content: shownDoc,
    editable,
    editorProps: {
      attributes: {
        id: contentId,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel && { 'aria-label': ariaLabel }),
        ...(labelledBy && { 'aria-labelledby': labelledBy }),
        ...(describedBy && { 'aria-describedby': describedBy }),
        ...(field.invalid && { 'aria-invalid': 'true' }),
        ...(field.required && { 'aria-required': 'true' }),
        ...((readOnly || unreadable) && { 'aria-readonly': 'true' }),
        ...(disabled && { 'aria-disabled': 'true' }),
        class: cn(editorContentClass(size, emphasis), 'outline-none')
      },
      handleKeyDown: (_view, event) => {
        if (!event.altKey || event.key !== 'F10') return false
        const firstEnabled = toolbarRef.current?.querySelector<HTMLElement>(
          'button:not([aria-disabled="true"])'
        )
        firstEnabled?.focus()
        return Boolean(firstEnabled)
      }
    },
    onUpdate: ({ editor: updated }) =>
      onValueChange?.({
        version: CURRENT_VERSION,
        preset,
        doc: updated.getJSON()
      })
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable, false)
    // useEditorState hears only of transactions, so its isEditable reads
    // would keep the old value.
    editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false))
  }, [editor, editable])

  useEffect(() => {
    placeholderRef.current = placeholder
    // An empty transaction redraws the placeholder decoration.
    editor?.view.dispatch(editor.state.tr)
  }, [editor, placeholder])

  useEffect(() => {
    if (!editor || !valueDoc || holdsDoc(editor, valueDoc)) return
    editor.commands.setContent(valueDoc, { emitUpdate: false })
  }, [editor, valueDoc])

  const editLink = () => {
    if (editor?.isEditable && editor.schema.marks.link) {
      setEditingLink(true)
    }
  }

  return (
    <EditorContext
      value={{
        editor,
        size,
        emphasis,
        contentId,
        toolbarRef,
        editLink,
        TiptapContent,
        ToolbarEngine: EditorToolbarEngine
      }}
    >
      <div
        data-slot='editor'
        data-emphasis={emphasis}
        aria-invalid={field.invalid || undefined}
        data-disabled={disabled ? '' : undefined}
        className={cn(
          // A grid or flex parent would otherwise grow to the toolbar's full row on a phone.
          'flex w-full min-w-0 flex-col rounded-lg',
          EDITOR_FRAME[emphasis],
          EDITOR_MIN_HEIGHT[size],
          EDITOR_TOOLBAR_HEIGHT[size],
          className
        )}
      >
        {children ?? (
          <>
            <EditorToolbarEngine />
            <EditorContent />
          </>
        )}
        <EditorLinkPopover
          editor={editor}
          open={editingLink}
          onOpenChange={setEditingLink}
        />
        {unreadable && !field.fieldId ? (
          // In a Field, Field.ErrorText shows it instead.
          <p
            role='alert'
            className='px-2 pb-2 text-sm text-subtle intent-danger'
          >
            {UNREADABLE}
          </p>
        ) : null}
        {name ? (
          <FormValue
            editor={editor}
            name={name}
            preset={preset}
            disabled={disabled}
            unreadDoc={unreadable ? shownDoc : null}
          />
        ) : null}
      </div>
    </EditorContext>
  )
}
