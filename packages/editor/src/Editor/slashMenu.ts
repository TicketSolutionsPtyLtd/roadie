import { Extension } from '@tiptap/core'
import {
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection
} from '@tiptap/pm/state'

/** The typed `/` and what follows it, which the slash menu filters by. */
export type SlashMatch = {
  /** Where the `/` starts, and where its paragraph's text ends. */
  from: number
  to: number
  query: string
}

/** What a mounted `Editor.SlashMenu` hands the trigger. */
export type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

type SlashMenuOptions = { menu: () => SlashMenuHandle | null }

export const slashMenuKey = new PluginKey<number | null>('slashMenu')

const CLOSE = 'close'

// Where the open menu's paragraph starts, while the caret is still in it
// after its `/`.
function openAt(state: EditorState, pos: number) {
  const node = state.doc.nodeAt(pos)
  const { selection } = state
  const inside =
    selection.empty &&
    selection.$from.depth === 1 &&
    selection.$from.before() === pos &&
    selection.$from.parentOffset > 0
  return node?.type.name === 'paragraph' &&
    node.textContent.startsWith('/') &&
    inside
    ? pos
    : null
}

/** The open menu's `/` and query, or null while it's closed. */
export function slashMatch(state: EditorState): SlashMatch | null {
  const pos = slashMenuKey.getState(state)
  const node = pos == null ? null : state.doc.nodeAt(pos)
  if (pos == null || !node) return null
  return {
    from: pos + 1,
    to: pos + 1 + node.content.size,
    query: node.textContent.slice(1)
  }
}

/** Closes the slash menu, leaving what was typed. */
export function closeSlashMenu(state: EditorState) {
  return state.tr.setMeta(slashMenuKey, CLOSE).setMeta('addToHistory', false)
}

/**
 * Opens the slash menu on a `/` typed into an empty top-level paragraph, and
 * keeps it open while the caret stays after it. A pasted `/` never opens it,
 * and once closed it stays closed until the next typed one.
 */
export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',
  // Ahead of every keymap, so Enter and the arrows reach the menu first.
  priority: 1000,

  addOptions() {
    return { menu: () => null }
  },

  addProseMirrorPlugins() {
    const { menu } = this.options
    return [
      new Plugin<number | null>({
        key: slashMenuKey,
        state: {
          init: () => null,
          apply: (tr, open, _old, state) => {
            const meta: unknown = tr.getMeta(slashMenuKey)
            if (meta === CLOSE) return null
            const pos = typeof meta === 'number' ? meta : open
            if (pos == null) return null
            return openAt(
              state,
              typeof meta === 'number' ? pos : tr.mapping.map(pos)
            )
          }
        },
        props: {
          handleTextInput(view, from, to, text) {
            const $from = view.state.doc.resolve(from)
            const empty =
              from === to &&
              $from.depth === 1 &&
              $from.parent.type.name === 'paragraph' &&
              $from.parent.content.size === 0
            if (text !== '/' || !empty || !menu()) return false
            // Typed straight after a click, the state can still hold the
            // caret where it was, so it's put after the `/` here.
            const tr = view.state.tr.insertText(text, from)
            view.dispatch(
              tr
                .setSelection(TextSelection.create(tr.doc, from + 1))
                .setMeta(slashMenuKey, $from.before())
            )
            return true
          },
          handleKeyDown(view, event) {
            if (slashMenuKey.getState(view.state) == null) return false
            return menu()?.onKeyDown(event) ?? false
          },
          handleDOMEvents: {
            blur(view) {
              if (slashMenuKey.getState(view.state) != null) {
                view.dispatch(closeSlashMenu(view.state))
              }
              return false
            }
          }
        }
      })
    ]
  }
})
