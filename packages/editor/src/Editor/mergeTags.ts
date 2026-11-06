import { BracketsCurlyIcon } from '@phosphor-icons/react'
import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

import type { EditorVariable } from '../schema'
import type { EditorInsertItem } from './insertItems'
import { TYPED_FOR_AUTHOR } from './insertMenu'

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
    insert: (chain) => chain.insertContent(tagOf(key)),
    enabled: (editor) => editor.can().insertContent(tagOf(key))
  }))
}

type MergeTagEnterOptions = { onEdit: () => void }

/** Opens a selected tag's form on Enter, which would otherwise split its line. */
export const MergeTagEnter = Extension.create<MergeTagEnterOptions>({
  name: 'mergeTagEnter',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const onTag =
          selection instanceof NodeSelection &&
          selection.node.type.name === 'variable'
        if (!onTag || !editor.isEditable) return false
        this.options.onEdit()
        return true
      }
    }
  }
})

/** The `/` menu's way into the merge tag menu, for those who don't know `{{`. */
export const mergeTagItem: EditorInsertItem = {
  label: 'Merge tag',
  icon: BracketsCurlyIcon,
  group: 'Email',
  keywords: ['variable', 'personalise', 'personalize', 'name', 'placeholder'],
  // Out of history, as the author never typed it: the tag picked is the step.
  insert: (chain) =>
    chain
      .insertContent(MERGE_TAG_OPEN)
      .setMeta('addToHistory', false)
      .setMeta(TYPED_FOR_AUTHOR, true),
  enabled: (editor) => editor.can().insertContent(tagOf(''))
}
