import { type Editor, Extension, type Range } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import {
  Suggestion,
  type SuggestionProps,
  exitSuggestion
} from '@tiptap/suggestion'

import type { EditorControlUi } from './controls'
import { insertBlock } from './emailEditing'
import {
  type EditorInsertItem,
  matchingInsertItems,
  namedInsertItems
} from './insertItems'

/**
 * Meta for a transaction that types a menu's `char` for the author, as Merge
 * tag in the `/` menu types `{{`, so Escape takes it back out.
 */
export const TYPED_FOR_AUTHOR = 'insertMenuTypedForAuthor'

const AFTER: Record<string, string> = {
  section: 'after this section',
  columns: 'after these columns',
  bulletList: 'after this list',
  orderedList: 'after this list'
}

// Worked out as the menu updates, not as it renders, since the caret's block
// can change while the editor object stays the same.
function placeNote(editor: Editor, item: EditorInsertItem) {
  const { $from } = editor.state.selection
  if (!item.topLevel || $from.depth <= 1) return undefined
  const fitsHere =
    item.topLevel === 'fallback' &&
    item.block !== undefined &&
    editor.can().command(insertBlock(item.block))
  if (fitsHere) return undefined
  return AFTER[$from.node(1).type.name] ?? 'after this block'
}

/** The open insert menu: its matching items, the active one, and how to place it. */
export type InsertMenuState = {
  items: readonly EditorInsertItem[]
  /** Shown in place of the items while none match. */
  noMatches?: string
  /** Beside each item, where it goes when not at the caret. */
  notes: readonly (string | undefined)[]
  active: number
  choose: (index: number) => void
  highlight: (index: number) => void
  /** Anchors the menu's element under the typed `/`, returning its unmount. */
  mount: SuggestionProps['mount']
}

export type InsertMenuOptions = {
  /** Typed to open the menu. */
  char: string
  /** Read as the menu opens, so the items can change after the editor is made. */
  items: () => readonly EditorInsertItem[]
  /** Whether the menu can open in a node of this type. */
  allowIn: (type: string) => boolean
  ui: () => EditorControlUi
  onChange: (state: InsertMenuState | null) => void
  /**
   * Shown while nothing matches, which keeps the menu open so Enter inserts
   * nothing, until a space follows. Without it, the menu closes.
   */
  noMatches?: string
}

type Props = SuggestionProps<EditorInsertItem, EditorInsertItem>

type InsertMenuStorage = {
  key: PluginKey<{ active: boolean; range: Range }>
}

/** Opens the insert menu on `/`, filtering its items by what follows. */
export const InsertMenu = Extension.create<
  InsertMenuOptions,
  InsertMenuStorage
>({
  name: 'insertMenu',

  // One per menu, as the `/` and `{{` menus can both be in an editor.
  addStorage() {
    return { key: new PluginKey(this.name) }
  },

  addOptions() {
    return {
      char: '/',
      items: () => [],
      // A button's label is plain text, so `/` there is only a character.
      allowIn: (type) => type !== 'button',
      ui: () => ({}) as EditorControlUi,
      onChange: () => {}
    }
  },

  addProseMirrorPlugins() {
    const { char, items, allowIn, ui, onChange, noMatches } = this.options
    const { key } = this.storage
    const typedForAuthor = new PluginKey<boolean>(`${this.name}TypedForAuthor`)
    let open: {
      props: Props
      active: number
      mount: Props['mount']
    } | null = null

    const publish = () => {
      const current = open
      if (!current || (current.props.items.length === 0 && !noMatches)) {
        onChange(null)
        return
      }
      onChange({
        items: current.props.items,
        notes: current.props.items.map((item) =>
          placeNote(current.props.editor, item)
        ),
        noMatches,
        active: current.active,
        choose: (index) => {
          const item = current.props.items[index]
          if (item) current.props.command(item)
        },
        highlight: (index) => {
          current.active = index
          publish()
        },
        mount: current.mount
      })
    }

    // Mounted once per opening, so the menu isn't placed again on each key.
    const start = (props: Props) => {
      open = { props, active: 0, mount: props.mount }
      publish()
    }
    const update = (props: Props) => {
      open = { props, active: 0, mount: open?.mount ?? props.mount }
      publish()
    }

    return [
      Suggestion<EditorInsertItem, EditorInsertItem>({
        editor: this.editor,
        pluginKey: key,
        char,
        // `{{` follows a word as often as a space, as in "Hi,{{".
        allowedPrefixes: char === '/' ? [' '] : null,
        allowSpaces: true,
        floatingUi: { strategy: 'fixed' },
        allow: ({ state, range }) =>
          items().length > 0 &&
          allowIn(state.doc.resolve(range.from).parent.type.name),
        // Past a space, a query that names nothing is the author's own text.
        shouldShow: ({ query }) =>
          !noMatches ||
          !/\s/.test(query) ||
          namedInsertItems(items(), query, ui()).length > 0,
        items: ({ query, editor }) => {
          const { range } = key.getState(editor.state)!
          return matchingInsertItems(items(), query, range, editor, ui())
        },
        command: ({ editor, range, props: item }) => {
          // Out of history, so one undo takes the block back to the line as
          // it was before the `/`, with no query left behind.
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setMeta('addToHistory', false)
            .run()
          const chain = editor.chain().command(({ tr }) => {
            closeHistory(tr)
            return true
          })
          item.insert(chain, ui()).run()
        },
        render: () => ({
          onStart: start,
          onUpdate: update,
          onExit: () => {
            open = null
            publish()
          },
          onKeyDown: ({ event, view, range }) => {
            if (event.key === 'Escape' && typedForAuthor.getState(view.state)) {
              view.dispatch(
                view.state.tr
                  .delete(range.from, range.from + char.length)
                  .setMeta('addToHistory', false)
              )
            }
            const count = open?.props.items.length ?? 0
            if (!open || (count === 0 && !noMatches)) return false
            // Suggestion closes the menu itself; this keeps a dialog around
            // the editor from closing too.
            if (event.key === 'Escape') {
              event.stopPropagation()
              return true
            }
            const modified =
              event.shiftKey || event.altKey || event.ctrlKey || event.metaKey
            const enter =
              event.key === 'Enter' && !event.isComposing && !modified
            // Past a space, Enter is the author's own line break again.
            if (count === 0) return enter && !/\s/.test(open.props.query)
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const step = event.key === 'ArrowDown' ? 1 : -1
              open.active = (open.active + step + count) % count
              publish()
              return true
            }
            // Shift+Enter and Mod+Enter break the line, as they do outside it.
            if (enter) {
              const item = open.props.items[open.active]
              if (item) open.props.command(item)
              return true
            }
            return false
          }
        })
      }),
      // After Suggestion's, so it reads whether this transaction opened it.
      new Plugin({
        key: typedForAuthor,
        state: {
          init: () => false,
          apply: (tr, typed, _old, state) =>
            Boolean(key.getState(state)?.active) &&
            (typed || tr.getMeta(TYPED_FOR_AUTHOR) === true)
        }
      })
    ]
  },

  onBlur() {
    const { view } = this.editor
    const { key } = this.storage
    if (key.getState(view.state)?.active) exitSuggestion(view, key)
  }
})
