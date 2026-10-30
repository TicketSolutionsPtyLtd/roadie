'use client'

import { type ComponentType, useEffect, useId, useRef, useState } from 'react'

import {
  Extension,
  type Extensions,
  type JSONContent,
  type Node,
  getSchema
} from '@tiptap/core'
import { Placeholder } from '@tiptap/extensions'
import { NodeSelection } from '@tiptap/pm/state'
import {
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
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
  defaultEmbedProviders,
  migrate,
  presets
} from '../schema'
import { EditorAltTextPopover } from './EditorAltTextPopover'
import { EditorBlockHandle } from './EditorBlockHandle'
import { EditorContent } from './EditorContent'
import { EditorContext } from './EditorContext'
import { EditorEmbedPopover } from './EditorEmbedPopover'
import { EditorEmbedView } from './EditorEmbedView'
import { EditorImageView } from './EditorImageView'
import { EditorLinkPopover } from './EditorLinkPopover'
import { EditorNodeToolbar, selectedNodeType } from './EditorNodeToolbar'
import type { EditorRootProps } from './EditorRoot'
import { EditorSlashMenuEngine } from './EditorSlashMenuEngine'
import { EditorTableToolbar } from './EditorTableToolbar'
import { EditorToolbarEngine } from './EditorToolbarEngine'
import { EmbedPaste } from './embedPaste'
import {
  ImageUpload,
  type UploadImage,
  imageFiles,
  replaceImage,
  uploadImages
} from './imageUpload'
import { isDev } from './isDev'
import { SlashMenu, type SlashMenuHandle } from './slashMenu'
import { resolvedPreset } from './startingValue'
import { selectedTable, withTableEditing } from './table'
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

type BlockMenuShortcutOptions = { open: () => boolean }

// Notion's shortcut for a block's actions.
const BlockMenuShortcut = Extension.create<BlockMenuShortcutOptions>({
  name: 'blockMenuShortcut',
  addKeyboardShortcuts() {
    return { 'Mod-/': () => this.options.open() }
  }
})

const BLOCK_HANDLE_PRESETS: ReadonlySet<Preset> = new Set(['blocks'])

type AltTextShortcutOptions = { onEditAlt: () => void }

const AltTextShortcut = Extension.create<AltTextShortcutOptions>({
  name: 'altTextShortcut',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const onImage =
          selection instanceof NodeSelection &&
          selection.node.type.name === 'image'
        if (!onImage || !editor.isEditable) return false
        this.options.onEditAlt()
        return true
      }
    }
  }
})

const NODE_VIEWS: Record<string, ComponentType<ReactNodeViewProps>> = {
  image: EditorImageView,
  embed: EditorEmbedView
}

function forEditor(extension: Extensions[number]) {
  const view = NODE_VIEWS[extension.name]
  if (!view) return extension
  return (extension as Node).extend({
    addNodeView: () => ReactNodeViewRenderer(view)
  })
}

// The saved schema stays React-free; the editor adds its views here.
const editorExtensions = Object.fromEntries(
  Object.entries(presets).map(([preset, extensions]) => [
    preset,
    withTableEditing(extensions).map(forEditor)
  ])
) as Record<Preset, typeof presets.basic>

const UNREADABLE =
  'This content couldn’t be loaded, so it can’t be edited here.'

const schemas = new Map<Preset, ReturnType<typeof getSchema>>()

// Tiptap swaps content its schema can't read for an empty document, which the
// next save would store, so the editor checks first.
function readsDoc(preset: Preset, doc: JSONContent) {
  let schema = schemas.get(preset)
  if (!schema) {
    schema = getSchema(presets[preset])
    schemas.set(preset, schema)
  }
  try {
    schema.nodeFromJSON(doc)
    return true
  } catch {
    return false
  }
}

function presetHoldsImages(preset: Preset) {
  return presets[preset].some(({ name }) => name === 'image')
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
  preset: presetProp,
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
  onUploadImage,
  embedProviders = defaultEmbedProviders,
  resolveUrl,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: EditorRootProps) {
  const placeholderRef = useRef(placeholder)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const nodeToolbarRef = useRef<HTMLDivElement>(null)
  const tableToolbarRef = useRef<HTMLDivElement>(null)
  const slashMenuRef = useRef<SlashMenuHandle>(null)
  const openBlockMenuRef = useRef<(() => void) | null>(null)
  const [editingLink, setEditingLink] = useState(false)
  const [editingAlt, setEditingAlt] = useState(false)
  const [editingEmbed, setEditingEmbed] = useState(false)
  const providersRef = useRef(embedProviders)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadRef = useRef<UploadImage | undefined>(onUploadImage)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const field = useFieldContext()
  const fieldInput = useFieldInputProps()
  const generatedId = useId()
  const contentId = fieldInput.id ?? generatedId
  const disabled = disabledProp || Boolean(field.disabled)
  const labelledBy =
    ariaLabelledBy ?? (ariaLabel ? undefined : field.labelId || undefined)
  const describedBy = fieldInput['aria-describedby']
  const preset = resolvedPreset({ preset: presetProp, value, defaultValue })
  const storedPreset = (value ?? defaultValue)?.preset
  const valueDoc = value && migrate(value, preset).doc
  const [defaultDoc] = useState(
    () => migrate(defaultValue ?? createEmptyValue(preset), preset).doc
  )
  const shownDoc = valueDoc ?? defaultDoc
  const unreadable = !readsDoc(preset, shownDoc)
  // Tiptap would warn of content it can't read and show an empty doc anyway.
  const readableDoc = unreadable ? createEmptyValue(preset).doc : shownDoc
  const editable = !readOnly && !disabled && !unreadable
  useFieldControlError(uploadError ?? (unreadable ? UNREADABLE : null))
  const holdsImages = presetHoldsImages(preset)
  const hasBlockHandle = BLOCK_HANDLE_PRESETS.has(preset)
  const uploads = {
    upload: () => (holdsImages ? uploadRef.current : undefined),
    onError: setUploadError
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...editorExtensions[preset],
      Placeholder.configure({
        placeholder: () => placeholderRef.current ?? ''
      }),
      LinkShortcut.configure({ onEditLink: () => setEditingLink(true) }),
      AltTextShortcut.configure({ onEditAlt: () => setEditingAlt(true) }),
      ImageUpload.configure(uploads),
      EmbedPaste.configure({ providers: () => providersRef.current }),
      SlashMenu.configure({ menu: () => slashMenuRef.current }),
      BlockMenuShortcut.configure({
        open: () => {
          openBlockMenuRef.current?.()
          return Boolean(openBlockMenuRef.current)
        }
      })
    ],
    content: readableDoc,
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
        // A grid item, which would otherwise grow to fit a wide table.
        class: cn(
          editorContentClass(size, emphasis),
          'min-w-0 outline-none',
          // Room for the block handle at each block's start.
          hasBlockHandle && emphasis !== 'subtler' && 'ps-10'
        )
      },
      handleDOMEvents: {
        // ProseMirror draws its selection only while focused, so a press that
        // also focuses the page gets the browser's caret, and a click on the
        // node already selected, such as a leading image, would change nothing.
        mousedown: (view) => {
          const { selection } = view.state
          if (
            view.editable &&
            !view.hasFocus() &&
            selection instanceof NodeSelection
          ) {
            view.focus()
          }
          return false
        }
      },
      handleKeyDown: (view, event) => {
        if (!event.altKey || event.key !== 'F10') return false
        const toolbar = selectedNodeType(view.state)
          ? nodeToolbarRef.current
          : selectedTable(view.state)
            ? tableToolbarRef.current
            : toolbarRef.current
        const firstEnabled = toolbar?.querySelector<HTMLElement>(
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
    if (presetProp && storedPreset && presetProp !== storedPreset && isDev()) {
      console.warn(
        `Editor: the value's preset "${storedPreset}" isn't the preset prop "${presetProp}", so it's read as "${presetProp}", dropping what that preset can't hold.`
      )
    }
  }, [presetProp, storedPreset])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable, false)
    // useEditorState hears only of transactions, so its isEditable reads
    // would keep the old value.
    editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false))
  }, [editor, editable])

  useEffect(() => {
    uploadRef.current = onUploadImage
    providersRef.current = embedProviders
  }, [onUploadImage, embedProviders])

  useEffect(() => {
    placeholderRef.current = placeholder
    // An empty transaction redraws the placeholder decoration.
    editor?.view.dispatch(editor.state.tr)
  }, [editor, placeholder])

  useEffect(() => {
    if (!editor || !valueDoc || holdsDoc(editor, readableDoc)) return
    editor.commands.setContent(readableDoc, { emitUpdate: false })
  }, [editor, valueDoc, readableDoc])

  const canUpload = Boolean(onUploadImage) && holdsImages
  const ui = {
    editLink: () => {
      if (editor?.isEditable && editor.schema.marks.link) {
        setEditingLink(true)
      }
    },
    editAlt: () => {
      if (editor?.isEditable) setEditingAlt(true)
    },
    editEmbed: () => {
      if (editor?.isEditable && editor.schema.nodes.embed) {
        setEditingEmbed(true)
      }
    },
    pickImage: canUpload ? () => fileInputRef.current?.click() : undefined,
    replaceImage: canUpload ? () => replaceInputRef.current?.click() : undefined
  }

  return (
    <EditorContext
      value={{
        editor,
        preset,
        size,
        emphasis,
        contentId,
        toolbarRef,
        ...ui,
        embedProviders,
        TiptapContent,
        ToolbarEngine: EditorToolbarEngine,
        SlashMenuEngine: EditorSlashMenuEngine,
        slashMenuRef
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
            <EditorSlashMenuEngine />
          </>
        )}
        {editor ? (
          <EditorNodeToolbar
            editor={editor}
            size={size}
            ui={ui}
            toolbarRef={nodeToolbarRef}
          />
        ) : null}
        {editor && hasBlockHandle ? (
          <EditorBlockHandle editor={editor} openMenuRef={openBlockMenuRef} />
        ) : null}
        {editor?.schema.nodes.table ? (
          <EditorTableToolbar
            editor={editor}
            size={size}
            ui={ui}
            toolbarRef={tableToolbarRef}
          />
        ) : null}
        <EditorLinkPopover
          editor={editor}
          open={editingLink}
          onOpenChange={setEditingLink}
        />
        <EditorAltTextPopover
          editor={editor}
          open={editingAlt}
          onOpenChange={setEditingAlt}
        />
        <EditorEmbedPopover
          editor={editor}
          providers={embedProviders}
          resolveUrl={resolveUrl}
          open={editingEmbed}
          onOpenChange={setEditingEmbed}
        />
        {(uploadError || unreadable) && !field.fieldId ? (
          // In a Field, Field.ErrorText shows it instead.
          <p
            role='alert'
            className='px-2 pb-2 text-sm text-subtle intent-danger'
          >
            {uploadError ?? UNREADABLE}
          </p>
        ) : null}
        {canUpload ? (
          <>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              multiple
              hidden
              aria-label='Image file'
              onChange={(event) => {
                const files = imageFiles(event.currentTarget.files)
                if (editor && files.length > 0) {
                  uploadImages(
                    editor.view,
                    files,
                    editor.state.selection.from,
                    uploads
                  )
                }
                event.currentTarget.value = ''
              }}
            />
            <input
              ref={replaceInputRef}
              type='file'
              accept='image/*'
              hidden
              aria-label='Replacement image file'
              onChange={(event) => {
                const [file] = imageFiles(event.currentTarget.files)
                const onImage =
                  editor && selectedNodeType(editor.state) === 'image'
                if (file && onImage) {
                  replaceImage(
                    editor.view,
                    file,
                    editor.state.selection.from,
                    uploads
                  )
                }
                event.currentTarget.value = ''
              }}
            />
          </>
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
