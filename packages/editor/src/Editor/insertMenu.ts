import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion, type SuggestionProps } from '@tiptap/suggestion'

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
  items: readonly EditorInsertItem[]
  ui: () => EditorControlUi
  onChange: (state: InsertMenuState | null) => void
}

type Props = SuggestionProps<EditorInsertItem, EditorInsertItem>

/** Opens the insert menu on `/`, filtering its items by what follows. */
export const InsertMenu = Extension.create<InsertMenuOptions>({
  name: 'insertMenu',

  addOptions() {
    return { items: [], ui: () => ({}) as EditorControlUi, onChange: () => {} }
  },

  addProseMirrorPlugins() {
    const { items, ui, onChange } = this.options
    if (items.length === 0) return []
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
        pluginKey: new PluginKey('insertMenu'),
        char: '/',
        allowSpaces: true,
        floatingUi: { strategy: 'fixed' },
        // A button's label is plain text, so `/` there is only a character.
        allow: ({ state, range }) =>
          state.doc.resolve(range.from).parent.type.name !== 'button',
        items: ({ query, editor }) =>
          matchingInsertItems(items, query, editor, ui()),
        command: ({ editor, range, props: item }) => {
          editor.chain().focus().deleteRange(range).run()
          item.run(editor, ui())
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
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const step = event.key === 'ArrowDown' ? 1 : -1
              open.active = (open.active + step + count) % count
              publish()
              return true
            }
            if (event.key === 'Enter' && !event.isComposing) {
              const item = open.props.items[open.active]
              if (item) open.props.command(item)
              return true
            }
            return false
          }
        })
      })
    ]
  }
})
