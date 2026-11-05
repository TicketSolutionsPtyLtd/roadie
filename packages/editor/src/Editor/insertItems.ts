import type { Icon } from '@phosphor-icons/react'
import {
  ArrowsVerticalIcon,
  ColumnsIcon,
  CursorClickIcon,
  FilmStripIcon,
  ImageIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  QuotesIcon,
  RectangleIcon,
  TableIcon,
  TextHFourIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextTIcon
} from '@phosphor-icons/react'
import type { ChainedCommands, JSONContent, Range } from '@tiptap/core'
import type { Editor } from '@tiptap/react'

import type { EditorBlock } from '../extensions'
import type { Preset } from '../schema'
import { COLUMN_COUNTS } from '../schema/emailAttrs'
import type { EditorControlUi } from './controls'
import { buttonBlock, insertBlock } from './emailEditing'
import { inGroupOrder } from './menuGroups'

/** One choice in the insert menu that `/` opens. */
export type EditorInsertItem = {
  label: string
  icon: Icon
  /** The heading it's listed under, such as Text or Layout. */
  group?: string
  /** More words it's found by, besides its label. */
  keywords?: readonly string[]
  /** The markdown that makes it as you type, shown beside it. */
  shortcut?: string
  /** Adds itself to the chain that removes the typed `/` and query. */
  insert: (chain: ChainedCommands, ui: EditorControlUi) => ChainedCommands
  /**
   * Whether it can go at the caret. `afterQuery` starts a chain, never
   * dispatched, on the line without the typed `/` and query, for a block
   * whose place depends on whether the line is empty.
   */
  enabled: (editor: Editor, afterQuery: () => ChainedCommands) => boolean
  /** Offers the item only while this holds, such as with an upload handler. */
  available?: (ui: EditorControlUi) => boolean
  /**
   * The block it adds, which the Blocks drawer puts after the caret's block.
   * Without one, the drawer runs it on a new line there.
   */
  block?: JSONContent
  /** The only places the drawer counts, in place of the block handle's. */
  containers?: ReadonlySet<string>
}

const paragraph: EditorInsertItem = {
  label: 'Paragraph',
  icon: TextTIcon,
  group: 'Text',
  keywords: ['text'],
  block: { type: 'paragraph' },
  insert: (chain) => chain.setParagraph(),
  // On a paragraph, setParagraph has nothing to change, so it reports false.
  enabled: (editor) =>
    editor.isActive('paragraph')
      ? !editor.isActive('listItem')
      : editor.can().setParagraph()
}

// The page owns h1, so a heading 1 is found as the top level there is.
const HEADINGS = [
  [2, TextHTwoIcon, ['h1', 'h2']],
  [3, TextHThreeIcon, ['h3']],
  [4, TextHFourIcon, ['h4']]
] as const

const headings = HEADINGS.map(([level, icon, tags]): EditorInsertItem => ({
  label: `Heading ${level}`,
  icon,
  group: 'Text',
  keywords: [...tags, 'title'],
  shortcut: '#'.repeat(level),
  block: { type: 'heading', attrs: { level } },
  insert: (chain) => chain.setHeading({ level }),
  enabled: (editor) => editor.can().setHeading({ level })
}))

const listOf = (type: string): JSONContent => ({
  type,
  content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
})

const bulletList: EditorInsertItem = {
  label: 'Bulleted list',
  icon: ListBulletsIcon,
  group: 'Text',
  keywords: ['ul'],
  shortcut: '-',
  block: listOf('bulletList'),
  insert: (chain) => chain.toggleBulletList(),
  // In its own list, the toggle would take the line out of it.
  enabled: (editor) =>
    !editor.isActive('bulletList') && editor.can().toggleBulletList()
}

const orderedList: EditorInsertItem = {
  label: 'Numbered list',
  icon: ListNumbersIcon,
  group: 'Text',
  keywords: ['ol'],
  shortcut: '1.',
  block: listOf('orderedList'),
  insert: (chain) => chain.toggleOrderedList(),
  enabled: (editor) =>
    !editor.isActive('orderedList') && editor.can().toggleOrderedList()
}

function block(
  label: string,
  icon: Icon,
  content: JSONContent,
  keywords?: readonly string[],
  group = 'Layout'
): EditorInsertItem {
  return {
    label,
    icon,
    group,
    keywords,
    block: content,
    insert: (chain) => chain.command(insertBlock(content)),
    enabled: (_editor, afterQuery) =>
      afterQuery().command(insertBlock(content)).run()
  }
}

const emptyParagraph = { type: 'paragraph' }

const section = block(
  'Section',
  RectangleIcon,
  { type: 'section', content: [emptyParagraph] },
  ['layout']
)

const columns = COLUMN_COUNTS.map((count) =>
  block(
    `${count} columns`,
    ColumnsIcon,
    {
      type: 'columns',
      content: Array.from({ length: count }, () => ({
        type: 'column',
        content: [emptyParagraph]
      }))
    },
    ['layout']
  )
)

const image: EditorInsertItem = {
  label: 'Image',
  icon: ImageIcon,
  group: 'Media',
  keywords: ['picture', 'photo', 'img'],
  insert: (chain, { pickImage }) => {
    pickImage?.()
    return chain
  },
  enabled: (_editor, afterQuery) =>
    afterQuery()
      .command(insertBlock({ type: 'image', attrs: { src: '' } }))
      .run(),
  available: ({ pickImage }) => Boolean(pickImage)
}

const button: EditorInsertItem = {
  label: 'Button',
  icon: CursorClickIcon,
  group: 'Email',
  keywords: ['link', 'call to action', 'btn', 'cta'],
  insert: (chain, { editButton }) => {
    editButton()
    return chain
  },
  enabled: (_editor, afterQuery) =>
    afterQuery()
      .command(insertBlock(buttonBlock('')))
      .run()
}

const spacer = block('Spacer', ArrowsVerticalIcon, { type: 'spacer' }, [
  'space',
  'gap'
])

const emailDivider = block('Divider', MinusIcon, { type: 'horizontalRule' }, [
  'line',
  'rule',
  'hr',
  '---'
])

// Only the blocks preset's rule turns `---` into one.
const divider: EditorInsertItem = { ...emailDivider, shortcut: '---' }

const quote: EditorInsertItem = {
  label: 'Quote',
  icon: QuotesIcon,
  group: 'Text',
  keywords: ['blockquote', '>'],
  shortcut: '>',
  insert: (chain) => chain.wrapIn('blockquote'),
  enabled: (editor) =>
    !editor.isActive('blockquote') && editor.can().wrapIn('blockquote')
}

const embed: EditorInsertItem = {
  label: 'Embed',
  icon: FilmStripIcon,
  group: 'Media',
  keywords: [
    'video',
    'audio',
    'link',
    'youtube',
    'vimeo',
    'spotify',
    'soundcloud',
    'tiktok'
  ],
  insert: (chain, { editEmbed }) => {
    editEmbed()
    return chain
  },
  // setEmbed would split a table to fit one in a cell, so check it as a block.
  enabled: (_editor, afterQuery) =>
    afterQuery()
      .command(insertBlock({ type: 'embed', attrs: { provider: '', id: '' } }))
      .run()
}

const cells = (type: string) =>
  Array.from({ length: 3 }, () => ({ type, content: [emptyParagraph] }))

const table = block('Table', TableIcon, {
  type: 'table',
  content: [
    { type: 'tableRow', content: cells('tableHeader') },
    { type: 'tableRow', content: cells('tableCell') },
    { type: 'tableRow', content: cells('tableCell') }
  ]
})

/** The insert menu's items, for each preset that has one. */
export const presetInsertItems: Partial<
  Record<Preset, readonly EditorInsertItem[]>
> = {
  blocks: [
    paragraph,
    ...headings,
    bulletList,
    orderedList,
    quote,
    image,
    embed,
    divider,
    table
  ],
  email: [
    paragraph,
    ...headings,
    bulletList,
    orderedList,
    image,
    section,
    ...columns,
    spacer,
    emailDivider,
    button
  ]
}

/** The insert menu's item for an app's own block, which goes in as an atom. */
export function customInsertItem({
  node,
  label,
  icon,
  keywords,
  group = 'More'
}: EditorBlock): EditorInsertItem {
  return block(label, icon, { type: node.name }, keywords, group)
}

/**
 * The items matching `query` that can go in place of the typed `range`, in
 * group order.
 */
export function matchingInsertItems(
  items: readonly EditorInsertItem[],
  query: string,
  range: Range,
  editor: Editor,
  ui: EditorControlUi
) {
  // `can()` changes nothing as it checks, so the query would still be there.
  const afterQuery = () =>
    editor
      .chain()
      .command(({ tr }) => {
        tr.setMeta('preventDispatch', true)
        return true
      })
      .deleteRange(range)
  // Matched by name first, as a block's fit is a transaction on each keystroke.
  const matches = namedInsertItems(items, query, ui).filter((item) =>
    item.enabled(editor, afterQuery)
  )
  return inGroupOrder(matches)
}

/** The items with a word in their label or keywords starting each word of `query`. */
export function namedInsertItems(
  items: readonly EditorInsertItem[],
  query: string,
  ui: EditorControlUi
) {
  const words = query.toLowerCase().trim().split(/\s+/)
  return items.filter((item) => {
    const names = [item.label, ...(item.keywords ?? [])]
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
    return (
      words.every((word) => names.some((name) => name.startsWith(word))) &&
      (item.available?.(ui) ?? true)
    )
  })
}
