import type { Icon } from '@phosphor-icons/react'
import {
  ArrowsVerticalIcon,
  ColumnsIcon,
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

import type { Preset } from '../schema'
import { COLUMN_COUNTS } from '../schema/emailAttrs'
import type { EditorControlUi } from './controls'
import { insertBlock } from './emailEditing'

/** One choice in the insert menu that `/` opens. */
export type EditorInsertItem = {
  label: string
  icon: Icon
  /** More words it's found by, besides its label. */
  keywords?: readonly string[]
  /** Adds itself to the chain that removes the typed `/` and query. */
  insert: (chain: ChainedCommands, ui: EditorControlUi) => ChainedCommands
  /**
   * Whether it can go at the caret. `afterQuery` starts a chain, never
   * dispatched, from once the typed `/` and query are gone, for a block whose
   * place depends on whether the line is empty.
   */
  enabled: (editor: Editor, afterQuery: () => ChainedCommands) => boolean
  /** Offers the item only while this holds, such as with an upload handler. */
  available?: (ui: EditorControlUi) => boolean
}

const paragraph: EditorInsertItem = {
  label: 'Paragraph',
  icon: TextTIcon,
  keywords: ['text'],
  insert: (chain) => chain.setParagraph(),
  // On a paragraph, setParagraph has nothing to change, so it reports false.
  enabled: (editor) =>
    editor.isActive('paragraph')
      ? !editor.isActive('listItem')
      : editor.can().setParagraph()
}

const HEADINGS = [
  [2, TextHTwoIcon],
  [3, TextHThreeIcon],
  [4, TextHFourIcon]
] as const

const headings = HEADINGS.map(([level, icon]): EditorInsertItem => ({
  label: `Heading ${level}`,
  icon,
  keywords: ['title'],
  insert: (chain) => chain.setHeading({ level }),
  enabled: (editor) => editor.can().setHeading({ level })
}))

const bulletList: EditorInsertItem = {
  label: 'Bulleted list',
  icon: ListBulletsIcon,
  insert: (chain) => chain.toggleBulletList(),
  // In its own list, the toggle would take the line out of it.
  enabled: (editor) =>
    !editor.isActive('bulletList') && editor.can().toggleBulletList()
}

const orderedList: EditorInsertItem = {
  label: 'Numbered list',
  icon: ListNumbersIcon,
  insert: (chain) => chain.toggleOrderedList(),
  enabled: (editor) =>
    !editor.isActive('orderedList') && editor.can().toggleOrderedList()
}

function block(
  label: string,
  icon: Icon,
  content: JSONContent,
  keywords?: readonly string[]
): EditorInsertItem {
  return {
    label,
    icon,
    keywords,
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
  keywords: ['picture', 'photo'],
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

const spacer = block('Spacer', ArrowsVerticalIcon, { type: 'spacer' }, [
  'space',
  'gap'
])

const divider = block('Divider', MinusIcon, { type: 'horizontalRule' }, [
  'line',
  'rule'
])

const quote: EditorInsertItem = {
  label: 'Quote',
  icon: QuotesIcon,
  keywords: ['blockquote'],
  insert: (chain) => chain.wrapIn('blockquote'),
  enabled: (editor) =>
    !editor.isActive('blockquote') && editor.can().wrapIn('blockquote')
}

const embed: EditorInsertItem = {
  label: 'Embed',
  icon: FilmStripIcon,
  keywords: ['video', 'audio'],
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
    divider,
    image,
    embed,
    table
  ],
  email: [
    paragraph,
    ...headings,
    bulletList,
    orderedList,
    section,
    ...columns,
    image,
    spacer,
    divider
  ]
}

/** The items matching `query` that can go in place of the typed `range`. */
export function matchingInsertItems(
  items: readonly EditorInsertItem[],
  query: string,
  range: Range,
  editor: Editor,
  ui: EditorControlUi
) {
  const words = query.toLowerCase().trim().split(/\s+/)
  // `can()` changes nothing as it checks, so the query would still be there.
  const afterQuery = () =>
    editor
      .chain()
      .command(({ tr }) => {
        tr.setMeta('preventDispatch', true)
        return true
      })
      .deleteRange(range)
  return items.filter((item) => {
    if (!(item.available?.(ui) ?? true) || !item.enabled(editor, afterQuery)) {
      return false
    }
    const names = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase()
    return words.every((word) => names.includes(word))
  })
}
