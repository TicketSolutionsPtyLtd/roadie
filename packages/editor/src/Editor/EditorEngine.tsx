'use client'

import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'

import {
  Extension,
  type Extensions,
  type JSONContent,
  type Node,
  getSchema
} from '@tiptap/core'
import type { UniqueID } from '@tiptap/extension-unique-id'
import { Placeholder } from '@tiptap/extensions'
import { closeHistory } from '@tiptap/pm/history'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  type EditorState,
  NodeSelection,
  Selection,
  type Transaction
} from '@tiptap/pm/state'
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

import type { EditorBlock } from '../extensions'
import {
  CURRENT_VERSION,
  type EditorValue,
  type Preset,
  createEmptyValue,
  defaultEmbedProviders,
  migrate,
  presets
} from '../schema'
import {
  BLOCK_ID,
  BLOCK_ID_TYPES,
  type PresetShape,
  presetShapes
} from '../schema/presetShapes'
import { textVariables } from '../schema/variables'
import { EditorAltTextPopover } from './EditorAltTextPopover'
import { EditorBlockHandle } from './EditorBlockHandle'
import { type BlockSettings, EditorBlockSettings } from './EditorBlockSettings'
import { EditorBlocksDrawer } from './EditorBlocksDrawer'
import { EditorBubbleMenuEngine } from './EditorBubbleMenuEngine'
import { EditorButtonPopover } from './EditorButtonPopover'
import { EditorContent } from './EditorContent'
import { EditorContext } from './EditorContext'
import { EditorEmbedPopover } from './EditorEmbedPopover'
import { EditorEmbedView } from './EditorEmbedView'
import { EditorImageView } from './EditorImageView'
import { EditorImportDialog, type ImportRequest } from './EditorImportDialog'
import { EditorInsertMenu } from './EditorInsertMenu'
import { EditorLinkPopover } from './EditorLinkPopover'
import { EditorNodeToolbar, selectedNodeType } from './EditorNodeToolbar'
import type { EditorRootProps } from './EditorRoot'
import { EditorTableToolbar } from './EditorTableToolbar'
import { EditorToolbarEngine } from './EditorToolbarEngine'
import { EditorVariablePopover } from './EditorVariablePopover'
import { EditorVariableView } from './EditorVariableView'
import {
  type BlockContainers,
  TOP_LEVEL,
  blockAt,
  duplicateBlock,
  moveBlock
} from './blockActions'
import { BlockClick } from './blockClick'
import { BlockDrag } from './blockDrag'
import type { EditorControlUi } from './controls'
import { withEmailEditing } from './emailEditing'
import { EmbedPaste } from './embedPaste'
import { focusEditor } from './focusEditor'
import { FocusedBlock, MenuBlock } from './focusedBlock'
import {
  ImageUpload,
  type UploadImage,
  imageFiles,
  replaceImage,
  uploadImages
} from './imageUpload'
import { customInsertItem, presetInsertItems } from './insertItems'
import { InsertMenu, type InsertMenuState } from './insertMenu'
import { isDev } from './isDev'
import { MERGE_TAG_OPEN, mergeTagItem, variableInsertItems } from './mergeTags'
import { emailSections } from './sections'
import { SourcePaste } from './sourcePaste'
import { presetLook, resolvedPreset } from './startingValue'
import { selectedTable, withTableEditing } from './table'
import { useToolbarMode } from './toolbarMode'
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

type BlockShortcutsOptions = { containers: BlockContainers }

// Notion's keys, on the caret's block, each its own undo step.
const BlockShortcuts = Extension.create<BlockShortcutsOptions>({
  name: 'blockShortcuts',
  addKeyboardShortcuts() {
    const { containers } = this.options
    const onCaretBlock =
      (action: (state: EditorState, pos: number) => Transaction | null) =>
      ({ editor }: { editor: TiptapEditor }) => {
        const { state, view } = editor
        const pos = blockAt(state, state.selection.from, containers)
        const tr = pos === null ? null : action(state, pos)
        if (tr) view.dispatch(closeHistory(tr))
        return pos !== null
      }
    return {
      'Mod-Shift-ArrowUp': onCaretBlock((state, pos) =>
        moveBlock(state, pos, -1, containers)
      ),
      'Mod-Shift-ArrowDown': onCaretBlock((state, pos) =>
        moveBlock(state, pos, 1, containers)
      ),
      'Mod-d': onCaretBlock(duplicateBlock)
    }
  }
})

const BLOCK_HANDLES: Partial<
  Record<Preset, { containers: BlockContainers; canAdd: boolean }>
> = {
  blocks: { containers: TOP_LEVEL, canAdd: false },
  email: { containers: new Set(['doc', 'section', 'column']), canAdd: true }
}

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

type SettingsShortcutOptions = {
  has: (name: string) => boolean
  onEdit: () => void
}

// Enter on a selected block with settings opens them, as on an image's alt.
const SettingsShortcut = Extension.create<SettingsShortcutOptions>({
  name: 'settingsShortcut',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const onBlock =
          selection instanceof NodeSelection &&
          this.options.has(selection.node.type.name)
        if (!onBlock || !editor.isEditable) return false
        this.options.onEdit()
        return true
      }
    }
  }
})

const NODE_VIEWS: Record<string, ComponentType<ReactNodeViewProps>> = {
  image: EditorImageView,
  embed: EditorEmbedView,
  variable: EditorVariableView
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
    withEmailEditing(withTableEditing(extensions)).map(forEditor)
  ])
) as Record<Preset, typeof presets.basic>

const UNREADABLE =
  'This content couldn’t be loaded, so it can’t be edited here.'

type Schema = ReturnType<typeof getSchema>

const schemas = new Map<Preset, Schema>()

function presetSchema(preset: Preset) {
  let schema = schemas.get(preset)
  if (!schema) {
    schema = getSchema(presets[preset])
    schemas.set(preset, schema)
  }
  return schema
}

/** Whether a block's name is one the preset's own nodes or marks use. */
function takenName(preset: Preset, { node }: EditorBlock) {
  const { nodes, marks } = presetSchema(preset)
  return Object.hasOwn(nodes, node.name) || Object.hasOwn(marks, node.name)
}

/** An app's blocks, only in the preset that takes them. */
function blocksFor(preset: Preset, blocks: readonly EditorBlock[] = []) {
  if (preset !== 'blocks') return []
  return blocks.filter((block) => !takenName(preset, block))
}

// Each app block is an id-carrying block too, so UniqueID needs its name.
function withBlocks(extensions: Extensions, blocks: readonly EditorBlock[]) {
  if (blocks.length === 0) return extensions
  const names = blocks.map(({ node }) => node.name)
  return [
    ...extensions.map((extension) =>
      extension.name === 'uniqueID'
        ? (extension as typeof UniqueID).configure({
            attributeName: BLOCK_ID,
            types: [...BLOCK_ID_TYPES, ...names]
          })
        : extension
    ),
    ...blocks.map(({ node }) => node)
  ]
}

// Tiptap swaps content its schema can't read for an empty document, which the
// next save would store, so the editor checks first.
function readsDoc(schema: Schema, doc: JSONContent) {
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

// At most an email's width, so an author sees the lines a reader will. Its
// columns query it as a container.
const EMAIL_CANVAS =
  '@container mx-auto w-full max-w-[600px] [--prose-measure:none]'

function holdsHttpsImagesOnly(preset: Preset) {
  const shape: PresetShape = presetShapes[preset]
  return shape.httpsImages === true
}

function presetKeepsBlockIds(preset: Preset) {
  return presets[preset].some(({ name }) => name === 'uniqueID')
}

function currentValue(editor: TiptapEditor, preset: Preset): EditorValue {
  return { version: CURRENT_VERSION, preset, doc: savedDoc(editor.getJSON()) }
}

function holdsDoc(
  editor: TiptapEditor,
  doc: JSONContent,
  holds = (held: ProseMirrorNode, given: ProseMirrorNode) => held.eq(given)
) {
  try {
    return holds(editor.state.doc, editor.schema.nodeFromJSON(doc))
  } catch {
    return false
  }
}

// A block's rule defaults to undefined, so a node with no other attrs saves
// none, as it did before rules.
function savedDoc(json: JSONContent): JSONContent {
  const saved = { ...json }
  if (saved.attrs && Object.values(saved.attrs).every((v) => v === undefined)) {
    delete saved.attrs
  }
  if (saved.content) saved.content = saved.content.map(savedDoc)
  return saved
}

// A block the value gives no id holds the one the editor gave it, or a parent
// that keeps no ids would have the editor set its value, and new ids, forever.
function holdsBlocks(held: ProseMirrorNode, given: ProseMirrorNode): boolean {
  const filled =
    given.attrs[BLOCK_ID] === null
      ? { ...given.attrs, [BLOCK_ID]: held.attrs[BLOCK_ID] }
      : given.attrs
  if (
    !held.hasMarkup(given.type, filled, given.marks) ||
    held.text !== given.text ||
    held.childCount !== given.childCount
  ) {
    return false
  }
  for (let i = 0; i < held.childCount; i++) {
    if (!holdsBlocks(held.child(i), given.child(i))) return false
  }
  return true
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
  const doc: JSONContent | null =
    unreadDoc ?? (editorDoc ? savedDoc(editorDoc.toJSON()) : null)
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
  emphasis: emphasisProp,
  className,
  children,
  onUploadImage,
  embedProviders = defaultEmbedProviders,
  resolveUrl,
  extensions: extensionsProp,
  variables,
  toolbar: toolbarProp,
  defaultToolbar,
  onToolbarChange,
  pinnable: pinnableProp = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: EditorRootProps) {
  const placeholderRef = useRef(placeholder)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const nodeToolbarRef = useRef<HTMLDivElement>(null)
  const tableToolbarRef = useRef<HTMLDivElement>(null)
  const openBubbleMenuRef = useRef<(() => boolean) | null>(null)
  const look = presetLook(
    resolvedPreset({ preset: presetProp, value, defaultValue })
  )
  const emphasis = emphasisProp ?? look.emphasis
  const { toolbar, pinnable, setToolbar } = useToolbarMode({
    toolbar: toolbarProp,
    defaultToolbar: defaultToolbar ?? look.toolbar,
    onToolbarChange,
    pinnable: pinnableProp
  })
  const toolbarModeRef = useRef(toolbar)
  const [toolbarExtras, setToolbarExtras] = useState<ReactNode>(null)
  const openBlockMenuRef = useRef<(() => void) | null>(null)
  const [editingLink, setEditingLink] = useState(false)
  const [editingAlt, setEditingAlt] = useState(false)
  const [editingEmbed, setEditingEmbed] = useState(false)
  const [editingButton, setEditingButton] = useState(false)
  const [editingVariable, setEditingVariable] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [focusSetting, setFocusSetting] = useState<string | undefined>()
  const [focusElement, setFocusElement] = useState<Element | null>(null)
  const [keepSelected, setKeepSelected] = useState(false)
  const editSettings = (
    path?: string,
    element: Element | null = null,
    fromKeyboard = false
  ) => {
    setFocusSetting(path)
    setFocusElement(element)
    setKeepSelected(fromKeyboard)
    setEditingSettings(true)
  }
  // Read by the editor's plugins and toolbars, made before the editor.
  const editorRef = useRef<TiptapEditor | null>(null)
  const editSettingsAt = (pos: number) => {
    const current = editorRef.current
    if (!current?.isEditable) return
    current.view.dispatch(
      current.state.tr.setSelection(
        NodeSelection.create(current.state.doc, pos)
      )
    )
    editSettings()
  }
  const [importing, setImporting] = useState<ImportRequest>({
    open: false,
    source: '',
    count: 0
  })
  const providersRef = useRef(embedProviders)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [insertMenu, setInsertMenu] = useState<InsertMenuState | null>(null)
  const [addingBlocks, setAddingBlocks] = useState(false)
  const [mergeTagMenu, setMergeTagMenu] = useState<InsertMenuState | null>(null)
  const variablesRef = useRef(variables)
  const uiRef = useRef<EditorControlUi | null>(null)
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
  // Tiptap fixes its schema when it creates the editor, so these are read once.
  const [blocks] = useState(() => blocksFor(preset, extensionsProp))
  const [blockLabels] = useState(() =>
    Object.fromEntries(blocks.map(({ node, label }) => [node.name, label]))
  )
  const [blockSettings] = useState(() =>
    Object.fromEntries(
      blocks.flatMap(({ node, label, settings }): [string, BlockSettings][] =>
        settings?.length ? [[node.name, { label, settings }]] : []
      )
    )
  )
  const hasSettings = (name: string) => Object.hasOwn(blockSettings, name)
  const [schema] = useState(() =>
    blocks.length > 0
      ? getSchema(withBlocks(presets[preset], blocks))
      : presetSchema(preset)
  )
  const customBlocks = blocks.map(({ node }) => node.name)
  const valueDoc = value && migrate(value, preset, { customBlocks }).doc
  const [defaultDoc] = useState(
    () =>
      migrate(defaultValue ?? createEmptyValue(preset), preset, {
        customBlocks
      }).doc
  )
  const shownDoc = valueDoc ?? defaultDoc
  const unreadable = !readsDoc(schema, shownDoc)
  // Tiptap would warn of content it can't read and show an empty doc anyway.
  const readableDoc = unreadable ? createEmptyValue(preset).doc : shownDoc
  const editable = !readOnly && !disabled && !unreadable
  useFieldControlError(uploadError ?? (unreadable ? UNREADABLE : null))
  const holdsImages = presetHoldsImages(preset)
  const blockHandle = BLOCK_HANDLES[preset]
  const holdsMergeTags = Boolean(schema.nodes.variable)
  const presetItems = [
    ...(presetInsertItems[preset] ?? []),
    ...blocks.map(customInsertItem)
  ]
  // Read as each menu opens, as `variables` can arrive after the editor is made.
  const insertItems = () =>
    holdsMergeTags && textVariables(variablesRef.current).length
      ? [...presetItems, mergeTagItem]
      : presetItems
  const uploads = {
    upload: () => (holdsImages ? uploadRef.current : undefined),
    onError: setUploadError,
    httpsOnly: holdsHttpsImagesOnly(preset)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...withBlocks(editorExtensions[preset], blocks),
      Placeholder.configure({
        placeholder: () => placeholderRef.current ?? ''
      }),
      LinkShortcut.configure({ onEditLink: () => setEditingLink(true) }),
      AltTextShortcut.configure({ onEditAlt: () => setEditingAlt(true) }),
      SettingsShortcut.configure({
        has: hasSettings,
        onEdit: () => editSettings(undefined, null, true)
      }),
      BlockClick.configure({ hasSettings, onEdit: editSettings }),
      ImageUpload.configure(uploads),
      EmbedPaste.configure({ providers: () => providersRef.current }),
      ...(preset === 'email'
        ? [
            SourcePaste.configure({
              onSource: (source) => uiRef.current?.importSource?.(source)
            })
          ]
        : []),
      InsertMenu.configure({
        items: insertItems,
        ui: () => uiRef.current!,
        onChange: setInsertMenu
      }),
      BlockMenuShortcut.configure({
        open: () => {
          openBlockMenuRef.current?.()
          return Boolean(openBlockMenuRef.current)
        }
      }),
      ...(blockHandle
        ? [
            BlockDrag,
            MenuBlock,
            BlockShortcuts.configure({ containers: blockHandle.containers })
          ]
        : []),
      FocusedBlock.configure({
        containers: blockHandle?.containers ?? TOP_LEVEL
      }),
      ...(holdsMergeTags
        ? [
            InsertMenu.extend({ name: 'mergeTagMenu' }).configure({
              char: MERGE_TAG_OPEN,
              items: () =>
                variableInsertItems(textVariables(variablesRef.current)),
              allowIn: () => true,
              ui: () => uiRef.current!,
              onChange: setMergeTagMenu
            })
          ]
        : [])
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
        ...(preset === 'email' && { 'data-email': '' }),
        // A grid item, which would otherwise grow to fit a wide table.
        class: cn(
          editorContentClass(size, emphasis),
          'min-w-0 outline-none',
          preset === 'email' && EMAIL_CANVAS,
          // Room for the block handle at each block's start.
          blockHandle &&
            emphasis !== 'subtler' &&
            (blockHandle.canAdd ? 'ps-15' : 'ps-10')
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
        // The selection menu is in the document only while it shows.
        const target = bubbleMenuRef.current?.isConnected
          ? bubbleMenuRef.current
          : selectedNodeType(view.state)
            ? nodeToolbarRef.current
            : selectedTable(view.state)
              ? tableToolbarRef.current
              : toolbarRef.current
        if (!target && toolbarModeRef.current === 'floating') {
          return openBubbleMenuRef.current?.() ?? false
        }
        const firstEnabled = target?.querySelector<HTMLElement>(
          'button:not([aria-disabled="true"])'
        )
        firstEnabled?.focus()
        return Boolean(firstEnabled)
      }
    },
    // ProseMirror starts at the doc's first selectable place, which selects a
    // leading image or embed, ring and all, before anyone touches it.
    onCreate: ({ editor: created }) => {
      const { state } = created
      const firstText = Selection.findFrom(state.doc.resolve(0), 1, true)
      if (!firstText || state.selection.eq(firstText)) return
      created.view.dispatch(
        state.tr.setSelection(firstText).setMeta('addToHistory', false)
      )
    },
    onUpdate: ({ editor: updated }) =>
      onValueChange?.(currentValue(updated, preset))
  })

  const leftOut = preset !== 'blocks' && Boolean(extensionsProp?.length)
  const taken = (preset === 'blocks' ? (extensionsProp ?? []) : [])
    .filter((block) => takenName(preset, block))
    .map(({ node }) => node.name)
    .join(', ')
  const holding = blocks
    .map(({ node }) => node.name)
    .filter((name) => {
      const type = schema.nodes[name]
      return !type?.isBlock || !type.isLeaf
    })
    .join(', ')
  const blockNames = (list: readonly EditorBlock[]) =>
    list.map(({ node }) => node.name).join()
  const changed =
    blockNames(blocksFor(preset, extensionsProp)) !== blockNames(blocks)
  useEffect(() => {
    if (!isDev()) return
    if (holding) {
      console.warn(
        `Editor: ${holding} must be a block holding no content, as an app's block saves only its attrs.`
      )
    }
    if (changed) {
      console.warn(
        "Editor: the editor reads extensions once, when it's created, so it keeps the blocks it started with. Give it a new key to change them."
      )
    }
    if (leftOut) {
      console.warn(
        `Editor: extensions are for the blocks preset, so the "${preset}" editor leaves them out.`
      )
    }
    if (taken) {
      console.warn(
        `Editor: the blocks preset already has ${taken}, so the editor leaves out the extensions of that name.`
      )
    }
  }, [leftOut, preset, taken, holding, changed])

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
    toolbarModeRef.current = toolbar
  }, [toolbar])

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    uploadRef.current = onUploadImage
    providersRef.current = embedProviders
    variablesRef.current = variables
  }, [onUploadImage, embedProviders, variables])

  useEffect(() => {
    placeholderRef.current = placeholder
    // An empty transaction redraws the placeholder decoration.
    editor?.view.dispatch(editor.state.tr)
  }, [editor, placeholder])

  useEffect(() => {
    if (!editor || !valueDoc || holdsDoc(editor, readableDoc, holdsBlocks)) {
      return
    }
    editor.commands.setContent(readableDoc, { emitUpdate: false })
    // The blocks preset gives each block without an id one as it's set.
    if (presetKeepsBlockIds(preset) && !holdsDoc(editor, readableDoc)) {
      onValueChange?.(currentValue(editor, preset))
    }
  }, [editor, valueDoc, readableDoc, preset, onValueChange])

  function importSource(source = '') {
    if (!editor?.isEditable) return
    setImporting(({ count }) => ({ open: true, source, count: count + 1 }))
  }
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
    editButton: () => {
      if (editor?.isEditable && editor.schema.nodes.button) {
        setEditingButton(true)
      }
    },
    editVariable: () => {
      if (editor?.isEditable) setEditingVariable(true)
    },
    pickImage: canUpload ? () => fileInputRef.current?.click() : undefined,
    replaceImage: canUpload
      ? () => replaceInputRef.current?.click()
      : undefined,
    importSource: preset === 'email' ? importSource : undefined
  }
  useEffect(() => {
    uiRef.current = ui
  })
  const drawerItems = blockHandle?.canAdd
    ? [
        ...presetItems.filter((item) => item.available?.(ui) ?? true),
        ...(preset === 'email' ? emailSections(variables) : [])
      ]
    : []

  return (
    <EditorContext
      value={{
        editor,
        preset,
        size,
        emphasis,
        contentId,
        toolbar,
        pinnable,
        setToolbar: (next) => {
          setToolbar(next)
          // The toolbar that held focus goes, so the text takes it.
          if (editor) focusEditor(editor)
        },
        toolbarExtras,
        setToolbarExtras,
        openBubbleMenuRef,
        toolbarRef,
        bubbleMenuRef,
        ...ui,
        openBlocks:
          drawerItems.length > 0 ? () => setAddingBlocks(true) : undefined,
        hasSettings,
        editSettingsAt,
        editingLink,
        embedProviders,
        variables,
        TiptapContent,
        ToolbarEngine: EditorToolbarEngine,
        BubbleMenuEngine: EditorBubbleMenuEngine
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
            <EditorBubbleMenuEngine />
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
        {editor && blockHandle ? (
          <EditorBlockHandle
            editor={editor}
            openMenuRef={openBlockMenuRef}
            containers={blockHandle.containers}
            canAdd={blockHandle.canAdd}
            appLabels={blockLabels}
            hasSettings={hasSettings}
            onSettings={editSettingsAt}
          />
        ) : null}
        {editor && blockHandle && drawerItems.length > 0 ? (
          <EditorBlocksDrawer
            editor={editor}
            open={addingBlocks}
            onOpenChange={setAddingBlocks}
            items={drawerItems}
            ui={ui}
            containers={blockHandle.containers}
          />
        ) : null}
        {editor ? (
          <EditorInsertMenu
            editor={editor}
            state={insertMenu}
            id={`${contentId}-insert`}
            label='Insert'
          />
        ) : null}
        {editor ? (
          <EditorInsertMenu
            editor={editor}
            state={mergeTagMenu}
            id={`${contentId}-merge-tags`}
            label='Merge tags'
          />
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
        <EditorButtonPopover
          editor={editor}
          open={editingButton}
          onOpenChange={setEditingButton}
        />
        <EditorBlockSettings
          editor={editor}
          open={editingSettings}
          onOpenChange={setEditingSettings}
          blocks={blockSettings}
          focusSetting={focusSetting}
          focusElement={focusElement}
          keepSelected={keepSelected}
          uploadImage={canUpload ? onUploadImage : undefined}
        />
        <EditorVariablePopover
          editor={editor}
          open={editingVariable}
          onOpenChange={setEditingVariable}
        />
        <EditorEmbedPopover
          editor={editor}
          providers={embedProviders}
          resolveUrl={resolveUrl}
          open={editingEmbed}
          onOpenChange={setEditingEmbed}
        />
        {preset === 'email' ? (
          <EditorImportDialog
            editor={editor}
            request={importing}
            onClose={() =>
              setImporting((request) => ({ ...request, open: false }))
            }
            variables={variables}
            embedProviders={embedProviders}
          />
        ) : null}
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
