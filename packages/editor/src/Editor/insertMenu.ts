import { Extension, type Range } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { PluginKey } from '@tiptap/pm/state'
import {
  Suggestion,
  type SuggestionProps,
  exitSuggestion
} from '@tiptap/suggestion'

import type { EditorControlUi } from './controls'
import { type EditorInsertItem, matchingInsertItems } from './insertItems'

/** The open insert menu: its matching items, the active one, and how to place it. */
export type InsertMenuState = {
  items: readonly EditorInsertItem[]
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
    const { char, items, allowIn, ui, onChange } = this.options
    const { key } = this.storage
    let open: {
      props: Props
      active: number
      mount: Props['mount']
    } | null = null

    const publish = () => {
      const current = open
      if (!current || current.props.items.length === 0) {
        onChange(null)
        return
      }
      onChange({
        items: current.props.items,
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
        items: ({ query, editor }) => {
          const { range } = key.getState(editor.state)!
          return matchingInsertItems(items(), query, range, editor, ui())
        },
        command: ({ editor, range, props: item }) => {
          // One undo step of its own, so undo returns to what was typed.
          const chain = editor
            .chain()
            .focus()
            .command(({ tr }) => {
              closeHistory(tr)
              return true
            })
            .deleteRange(range)
          item.insert(chain, ui()).run()
        },
        render: () => ({
          onStart: start,
          onUpdate: update,
          onExit: () => {
            open = null
            publish()
          },
          onKeyDown: ({ event }) => {
            const count = open?.props.items.length ?? 0
            if (!open || count === 0) return false
            // Suggestion closes the menu itself; this keeps a dialog around
            // the editor from closing too.
            if (event.key === 'Escape') {
              event.stopPropagation()
              return true
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const step = event.key === 'ArrowDown' ? 1 : -1
              open.active = (open.active + step + count) % count
              publish()
              return true
            }
            const modified =
              event.shiftKey || event.altKey || event.ctrlKey || event.metaKey
            // Shift+Enter and Mod+Enter break the line, as they do outside it.
            if (event.key === 'Enter' && !event.isComposing && !modified) {
              const item = open.props.items[open.active]
              if (item) open.props.command(item)
              return true
            }
            return false
          }
        })
      })
    ]
  },

  onBlur() {
    const { view } = this.editor
    const { key } = this.storage
    if (key.getState(view.state)?.active) exitSuggestion(view, key)
  }
})
