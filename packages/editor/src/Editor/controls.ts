import type { Icon } from '@phosphor-icons/react'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ColumnsIcon,
  ColumnsPlusLeftIcon,
  ColumnsPlusRightIcon,
  FilmStripIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  PencilSimpleIcon,
  RowsIcon,
  RowsPlusBottomIcon,
  RowsPlusTopIcon,
  SquareSplitVerticalIcon,
  SwapIcon,
  TableIcon,
  TextAaIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TrashIcon
} from '@phosphor-icons/react'
import type { Editor } from '@tiptap/react'

import type { Preset } from '../schema'
import { HEADING_LEVELS } from '../schema/headings'
import { hasHeaderRow, leavesAColumn, leavesARow, selectedTable } from './table'

/** What a control can open in the editor's own UI. */
export type EditorControlUi = {
  editLink: () => void
  /** Opens the embed editor, on the selected embed if there is one. */
  editEmbed: () => void
  pickImage: (() => void) | undefined
  editAlt: () => void
  /** Opens the file picker to replace the selected image, or undefined without `onUploadImage`. */
  replaceImage: (() => void) | undefined
}

export type EditorControl = {
  label: string
  icon: Icon
  /** Kbd keys, such as `['mod', 'b']`. */
  shortcut?: readonly string[]
  run: (editor: Editor, ui: EditorControlUi) => void
  /** Makes the control a toggle, pressed while this holds. */
  pressed?: (editor: Editor) => boolean
  enabled?: (editor: Editor) => boolean
  /** Shows the control only while this holds, such as with an upload handler. */
  available?: (ui: EditorControlUi) => boolean
}

export const SEPARATOR = 'separator'

/** One choice in the block type menu. */
export type EditorBlockType = {
  label: string
  shortcut: readonly string[]
  /** Whether the caret's block is this type. */
  active: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

export type EditorBlockMenu = {
  kind: 'blockMenu'
  label: string
  types: readonly EditorBlockType[]
}

export type EditorToolbarItem =
  EditorControl | EditorBlockMenu | typeof SEPARATOR

const bold: EditorControl = {
  label: 'Bold',
  icon: TextBIcon,
  shortcut: ['mod', 'b'],
  run: (editor) => editor.chain().focus().toggleBold().run(),
  pressed: (editor) => editor.isActive('bold')
}

const italic: EditorControl = {
  label: 'Italic',
  icon: TextItalicIcon,
  shortcut: ['mod', 'i'],
  run: (editor) => editor.chain().focus().toggleItalic().run(),
  pressed: (editor) => editor.isActive('italic')
}

const underline: EditorControl = {
  label: 'Underline',
  icon: TextUnderlineIcon,
  shortcut: ['mod', 'u'],
  run: (editor) => editor.chain().focus().toggleUnderline().run(),
  pressed: (editor) => editor.isActive('underline')
}

const link: EditorControl = {
  label: 'Link',
  icon: LinkIcon,
  shortcut: ['mod', 'k'],
  run: (_editor, { editLink }) => editLink(),
  pressed: (editor) => editor.isActive('link')
}

const bulletList: EditorControl = {
  label: 'Bulleted list',
  icon: ListBulletsIcon,
  shortcut: ['mod', 'shift', '8'],
  run: (editor) => editor.chain().focus().toggleBulletList().run(),
  pressed: (editor) => editor.isActive('bulletList')
}

const orderedList: EditorControl = {
  label: 'Numbered list',
  icon: ListNumbersIcon,
  shortcut: ['mod', 'shift', '7'],
  run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  pressed: (editor) => editor.isActive('orderedList')
}

const undo: EditorControl = {
  label: 'Undo',
  icon: ArrowCounterClockwiseIcon,
  shortcut: ['mod', 'z'],
  run: (editor) => editor.chain().focus().undo().run(),
  enabled: (editor) => editor.can().undo()
}

const redo: EditorControl = {
  label: 'Redo',
  icon: ArrowClockwiseIcon,
  shortcut: ['mod', 'shift', 'z'],
  run: (editor) => editor.chain().focus().redo().run(),
  enabled: (editor) => editor.can().redo()
}

const divider: EditorControl = {
  label: 'Divider',
  icon: MinusIcon,
  run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  enabled: (editor) => editor.can().setHorizontalRule()
}

const image: EditorControl = {
  label: 'Image',
  icon: ImageIcon,
  run: (_editor, { pickImage }) => pickImage?.(),
  available: ({ pickImage }) => Boolean(pickImage)
}

const embed: EditorControl = {
  label: 'Embed',
  icon: FilmStripIcon,
  run: (_editor, { editEmbed }) => editEmbed(),
  enabled: (editor) => editor.can().setEmbed({ provider: '', id: '' })
}

const NEW_TABLE = { rows: 3, cols: 3, withHeaderRow: true }

const table: EditorControl = {
  label: 'Table',
  icon: TableIcon,
  run: (editor) => editor.chain().focus().insertTable(NEW_TABLE).run(),
  // A cell holds only paragraphs, so a table never goes in one.
  enabled: (editor) =>
    !selectedTable(editor.state) && editor.can().insertTable(NEW_TABLE)
}

const headings: EditorBlockType[] = HEADING_LEVELS.map((level) => ({
  label: `Heading ${level}`,
  shortcut: ['mod', 'alt', String(level)],
  active: (editor) => editor.isActive('heading', { level }),
  run: (editor) => editor.chain().focus().setHeading({ level }).run()
}))

const quote: EditorBlockType = {
  label: 'Quote',
  shortcut: ['mod', 'shift', 'b'],
  active: (editor) => editor.isActive('blockquote'),
  run: (editor) => {
    const chain = editor.chain().focus().setParagraph()
    if (!editor.isActive('blockquote')) chain.wrapIn('blockquote')
    chain.run()
  }
}

const paragraph: EditorBlockType = {
  label: 'Paragraph',
  shortcut: ['mod', 'alt', '0'],
  active: (editor) =>
    editor.isActive('paragraph') && !editor.isActive('blockquote'),
  run: (editor) => {
    const chain = editor.chain().focus().setParagraph()
    if (editor.isActive('blockquote')) chain.lift('blockquote')
    chain.run()
  }
}

const blockType: EditorBlockMenu = {
  kind: 'blockMenu',
  label: 'Block type',
  types: [paragraph, ...headings, quote]
}

const basicControls = [
  bold,
  italic,
  underline,
  link,
  SEPARATOR,
  bulletList,
  orderedList
] as const

const history = [undo, redo] as const

// Each preset lists only controls for extensions it holds.
export const presetControls: Record<Preset, readonly EditorToolbarItem[]> = {
  basic: [...basicControls, SEPARATOR, ...history],
  rich: [
    blockType,
    SEPARATOR,
    ...basicControls,
    SEPARATOR,
    divider,
    image,
    embed,
    table,
    SEPARATOR,
    ...history
  ]
}

const altText: EditorControl = {
  label: 'Alt text',
  icon: TextAaIcon,
  run: (_editor, { editAlt }) => editAlt()
}

const replaceImage: EditorControl = {
  label: 'Replace image',
  icon: SwapIcon,
  run: (_editor, { replaceImage: replace }) => replace?.(),
  available: ({ replaceImage: replace }) => Boolean(replace)
}

const editEmbedLink: EditorControl = {
  label: 'Edit link',
  icon: PencilSimpleIcon,
  run: (_editor, { editEmbed }) => editEmbed()
}

function remove(label: string): EditorControl {
  return {
    label,
    icon: TrashIcon,
    run: (editor) => editor.chain().focus().deleteSelection().run()
  }
}

export type EditorNodeType = 'image' | 'embed'

/** The actions in a selected node's own toolbar. */
export const nodeControls: Record<EditorNodeType, readonly EditorControl[]> = {
  image: [altText, replaceImage, remove('Remove image')],
  embed: [editEmbedLink, remove('Remove embed')]
}

type TableCommand =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteRow'
  | 'deleteColumn'
  | 'deleteTable'

function tableAction(
  label: string,
  icon: Icon,
  command: TableCommand,
  enabled: EditorControl['enabled'] = (editor) => editor.can()[command]()
): EditorControl {
  return {
    label,
    icon,
    run: (editor) => editor.chain().focus()[command]().run(),
    enabled
  }
}

const headerRow: EditorControl = {
  label: 'Header row',
  icon: SquareSplitVerticalIcon,
  run: (editor) => editor.chain().focus().toggleHeaderRow().run(),
  pressed: (editor) => hasHeaderRow(editor.state)
}

/** The actions in the toolbar of the table holding the selection. */
export const tableControls: readonly (EditorControl | typeof SEPARATOR)[] = [
  tableAction('Add row above', RowsPlusTopIcon, 'addRowBefore'),
  tableAction('Add row below', RowsPlusBottomIcon, 'addRowAfter'),
  tableAction('Add column before', ColumnsPlusLeftIcon, 'addColumnBefore'),
  tableAction('Add column after', ColumnsPlusRightIcon, 'addColumnAfter'),
  SEPARATOR,
  tableAction('Delete row', RowsIcon, 'deleteRow', ({ state }) =>
    leavesARow(state)
  ),
  tableAction('Delete column', ColumnsIcon, 'deleteColumn', ({ state }) =>
    leavesAColumn(state)
  ),
  SEPARATOR,
  headerRow,
  SEPARATOR,
  tableAction('Delete table', TrashIcon, 'deleteTable')
]

const ARIA_KEY_NAMES: Record<string, string> = { shift: 'Shift', alt: 'Alt' }

/** Kbd keys as `aria-keyshortcuts`, with Mod resolved as ProseMirror does. */
export function ariaKeyShortcuts(keys: readonly string[]) {
  const mod = /Mac|iP(hone|[oa]d)/.test(navigator.platform) ? 'Meta' : 'Control'
  return keys
    .map((key) =>
      key === 'mod' ? mod : (ARIA_KEY_NAMES[key] ?? key.toUpperCase())
    )
    .join('+')
}
