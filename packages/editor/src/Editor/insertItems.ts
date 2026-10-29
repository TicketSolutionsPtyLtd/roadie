import type { Icon } from '@phosphor-icons/react'
import {
  ArrowsVerticalIcon,
  ColumnsIcon,
  ImageIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  RectangleIcon,
  TextHFourIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextTIcon
} from '@phosphor-icons/react'
import type { JSONContent } from '@tiptap/core'
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
  /** Runs at the caret, once the typed `/` and query are gone. */
  run: (editor: Editor, ui: EditorControlUi) => void
  /** Whether it can go at the caret. */
  enabled: (editor: Editor) => boolean
  /** Offers the item only while this holds, such as with an upload handler. */
  available?: (ui: EditorControlUi) => boolean
}

const paragraph: EditorInsertItem = {
  label: 'Paragraph',
  icon: TextTIcon,
  keywords: ['text'],
  run: (editor) => editor.chain().focus().setParagraph().run(),
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
  run: (editor) => editor.chain().focus().setHeading({ level }).run(),
  enabled: (editor) => editor.can().setHeading({ level })
}))

const bulletList: EditorInsertItem = {
  label: 'Bulleted list',
  icon: ListBulletsIcon,
  run: (editor) => editor.chain().focus().toggleBulletList().run(),
  // In its own list, the toggle would take the line out of it.
  enabled: (editor) =>
    !editor.isActive('bulletList') && editor.can().toggleBulletList()
}

const orderedList: EditorInsertItem = {
  label: 'Numbered list',
  icon: ListNumbersIcon,
  run: (editor) => editor.chain().focus().toggleOrderedList().run(),
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
    run: (editor) => editor.chain().focus().command(insertBlock(content)).run(),
    enabled: (editor) => editor.can().command(insertBlock(content))
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
  run: (_editor, { pickImage }) => pickImage?.(),
  enabled: (editor) =>
    editor.can().command(insertBlock({ type: 'image', attrs: { src: '' } })),
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

/** The insert menu's items, for each preset that has one. */
export const presetInsertItems: Partial<
  Record<Preset, readonly EditorInsertItem[]>
> = {
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

/** The items matching `query` that can go at the caret. */
export function matchingInsertItems(
  items: readonly EditorInsertItem[],
  query: string,
  editor: Editor,
  ui: EditorControlUi
) {
  const words = query.toLowerCase().trim().split(/\s+/)
  return items.filter((item) => {
    if (!(item.available?.(ui) ?? true) || !item.enabled(editor)) return false
    const names = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase()
    return words.every((word) => names.includes(word))
  })
}
