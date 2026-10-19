import type { Icon } from '@phosphor-icons/react'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextItalicIcon
} from '@phosphor-icons/react'
import type { Editor } from '@tiptap/react'

/** What a control can open in the editor's own UI. */
export type EditorControlUi = {
  editLink: () => void
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
}

export const SEPARATOR = 'separator'

export type EditorToolbarItem = EditorControl | typeof SEPARATOR

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

const basicControls = [
  bold,
  italic,
  link,
  SEPARATOR,
  bulletList,
  orderedList
] as const

const history = [undo, redo] as const

// Only controls for extensions the basic preset holds.
export const editorControls: readonly EditorToolbarItem[] = [
  ...basicControls,
  SEPARATOR,
  ...history
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
