import type { Icon } from '@phosphor-icons/react'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ColumnsPlusLeftIcon,
  ColumnsPlusRightIcon,
  FilmStripIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  PencilSimpleIcon,
  QuotesIcon,
  RowsPlusBottomIcon,
  RowsPlusTopIcon,
  SquareSplitVerticalIcon,
  SwapIcon,
  TableIcon,
  TextAaIcon,
  TextBIcon,
  TextHFourIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextTIcon,
  TextUnderlineIcon,
  TrashIcon
} from '@phosphor-icons/react'
import type { ChainedCommands } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Editor } from '@tiptap/react'

import type { EditorBlock } from '../extensions'
import type { Preset } from '../schema'
import { HEADING_LEVELS } from '../schema/headings'
import type { SlashMatch } from './slashMenu'
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
  | EditorControl
  | EditorBlockMenu
  | typeof SEPARATOR

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

const richControls: readonly EditorToolbarItem[] = [
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

// Each preset lists only controls for extensions it holds.
export const presetControls: Record<Preset, readonly EditorToolbarItem[]> = {
  basic: [...basicControls, SEPARATOR, ...history],
  rich: richControls,
  blocks: richControls
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

/** A menu item, in the danger intent when it deletes. */
export type EditorTableAction = EditorControl & { intent?: 'danger' }

/** A toolbar button that opens a menu of a row's or a column's actions. */
export type EditorTableMenu = {
  kind: 'tableMenu'
  label: string
  items: readonly (EditorTableAction | typeof SEPARATOR)[]
}

export type EditorTableItem = EditorControl | EditorTableMenu | typeof SEPARATOR

// Phosphor has no remove-row or remove-column icon, so these delete from a
// labelled menu rather than an icon button.
const rowMenu: EditorTableMenu = {
  kind: 'tableMenu',
  label: 'Row',
  items: [
    tableAction('Insert above', RowsPlusTopIcon, 'addRowBefore'),
    tableAction('Insert below', RowsPlusBottomIcon, 'addRowAfter'),
    SEPARATOR,
    {
      ...tableAction('Delete row', TrashIcon, 'deleteRow', ({ state }) =>
        leavesARow(state)
      ),
      intent: 'danger'
    }
  ]
}

const columnMenu: EditorTableMenu = {
  kind: 'tableMenu',
  label: 'Column',
  items: [
    tableAction('Insert before', ColumnsPlusLeftIcon, 'addColumnBefore'),
    tableAction('Insert after', ColumnsPlusRightIcon, 'addColumnAfter'),
    SEPARATOR,
    {
      ...tableAction('Delete column', TrashIcon, 'deleteColumn', ({ state }) =>
        leavesAColumn(state)
      ),
      intent: 'danger'
    }
  ]
}

/** The actions in the toolbar of the table holding the selection. */
export const tableControls: readonly EditorTableItem[] = [
  rowMenu,
  columnMenu,
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

/** A block the slash menu inserts in place of the typed `/` and its query. */
export type EditorSlashItem = {
  label: string
  icon: Icon
  /** Other words it's found by. */
  keywords?: readonly string[]
  run: (editor: Editor, ui: EditorControlUi, match: SlashMatch) => void
  available?: (ui: EditorControlUi) => boolean
}

// One undo step of its own, so undo returns to the typed `/`.
function replacingSlash(
  editor: Editor,
  { from, to }: SlashMatch
): ChainedCommands {
  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      closeHistory(tr)
      return true
    })
    .deleteRange({ from, to })
}

function slashBlock(
  label: string,
  icon: Icon,
  insert: (chain: ChainedCommands) => ChainedCommands,
  keywords?: readonly string[]
): EditorSlashItem {
  return {
    label,
    icon,
    keywords,
    run: (editor, _ui, match) => insert(replacingSlash(editor, match)).run()
  }
}

const HEADING_ICONS = {
  2: TextHTwoIcon,
  3: TextHThreeIcon,
  4: TextHFourIcon
} as const

const blockSlashItems: readonly EditorSlashItem[] = [
  slashBlock('Text', TextTIcon, (chain) => chain, ['paragraph']),
  ...HEADING_LEVELS.map((level) =>
    slashBlock(
      `Heading ${level}`,
      HEADING_ICONS[level],
      (chain) => chain.setHeading({ level }),
      ['title']
    )
  ),
  slashBlock(
    'Bulleted list',
    ListBulletsIcon,
    (chain) => chain.toggleBulletList(),
    ['unordered']
  ),
  slashBlock(
    'Numbered list',
    ListNumbersIcon,
    (chain) => chain.toggleOrderedList(),
    ['ordered']
  ),
  slashBlock('Quote', QuotesIcon, (chain) => chain.wrapIn('blockquote'), [
    'blockquote'
  ]),
  slashBlock('Divider', MinusIcon, (chain) => chain.setHorizontalRule(), [
    'rule',
    'line'
  ]),
  {
    label: 'Image',
    icon: ImageIcon,
    keywords: ['photo', 'picture'],
    run: (editor, ui, match) => {
      replacingSlash(editor, match).run()
      ui.pickImage?.()
    },
    available: ({ pickImage }) => Boolean(pickImage)
  },
  {
    label: 'Embed',
    icon: FilmStripIcon,
    keywords: ['video', 'audio', 'youtube', 'spotify'],
    run: (editor, ui, match) => {
      replacingSlash(editor, match).run()
      ui.editEmbed()
    }
  },
  slashBlock('Table', TableIcon, (chain) => chain.insertTable(NEW_TABLE))
]

/** The blocks each preset's slash menu offers; only `blocks` has one. */
export const presetSlashItems: Record<Preset, readonly EditorSlashItem[]> = {
  basic: [],
  rich: [],
  blocks: blockSlashItems
}

/** The slash menu's entry for an app's own block, inserted in place of the `/`. */
export function customSlashItem({
  node,
  label,
  icon,
  keywords
}: EditorBlock): EditorSlashItem {
  return slashBlock(
    label,
    icon,
    (chain) => chain.insertContent({ type: node.name }),
    keywords
  )
}
