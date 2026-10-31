import { BracketsCurlyIcon } from '@phosphor-icons/react'
import type { Editor } from '@tiptap/react'

import type { EditorVariable } from '../schema'
import type { EditorInsertItem } from './insertItems'

/** Typed to open the merge tag menu, as most template languages open a tag. */
export const MERGE_TAG_OPEN = '{{'

const tagOf = (key: string) => ({ type: 'variable', attrs: { key } })

/** The merge tag menu's items, one per variable. */
export function variableInsertItems(
  variables: readonly EditorVariable[]
): EditorInsertItem[] {
  return variables.map(({ key, label }) => ({
    label,
    icon: BracketsCurlyIcon,
    keywords: [key],
    run: (editor) => editor.chain().focus().insertContent(tagOf(key)).run(),
    enabled: (editor) => editor.can().insertContent(tagOf(key))
  }))
}

/** The `/` menu's way into the merge tag menu, for those who don't know `{{`. */
export const mergeTagItem: EditorInsertItem = {
  label: 'Merge tag',
  icon: BracketsCurlyIcon,
  keywords: ['variable', 'personalise', 'personalize', 'name', 'placeholder'],
  run: (editor: Editor) =>
    editor.chain().focus().insertContent(MERGE_TAG_OPEN).run(),
  enabled: (editor) => editor.can().insertContent(tagOf(''))
}
