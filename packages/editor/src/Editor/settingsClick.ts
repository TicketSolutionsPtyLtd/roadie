import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

type SettingsClickOptions = {
  /** The atom nodes, by name, whose settings a click opens. */
  types: readonly string[]
  onEdit: (name: string) => void
}

type Press = { x: number; y: number; selected: boolean; mouse: boolean }

function atomAt(view: EditorView, target: Node, types: readonly string[]) {
  let at: number | null = null
  view.state.doc.descendants((node, pos) => {
    if (at !== null) return false
    const dom = view.nodeDOM(pos)
    if (!(dom instanceof Node) || !dom.contains(target)) return false
    if (node.isAtom && types.includes(node.type.name)) at = pos
    return true
  })
  return at
}

/**
 * A click on an image or an embed opens its settings, as a click on a
 * block's does. A touch opens them only on one already selected, so a
 * scroll's tap just selects it.
 */
export const SettingsClick = Extension.create<SettingsClickOptions>({
  name: 'settingsClick',
  addOptions: () => ({ types: [], onEdit: () => {} }),
  addProseMirrorPlugins() {
    const { types, onEdit } = this.options
    let press: Press | null = null
    let pending: ReturnType<typeof setTimeout> | undefined
    return [
      new Plugin({
        view: (view) => {
          const pointerdown = (event: PointerEvent) => {
            const { selection } = view.state
            const target = event.target instanceof Node ? event.target : null
            const at = target ? atomAt(view, target, types) : null
            // A modified press extends the selection or opens a menu.
            const plain =
              event.button === 0 &&
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            press =
              at === null || !plain
                ? null
                : {
                    x: event.clientX,
                    y: event.clientY,
                    selected:
                      selection instanceof NodeSelection &&
                      selection.from === at,
                    mouse: event.pointerType === 'mouse'
                  }
          }
          const release = (event: MouseEvent) => {
            const begun = press
            press = null
            const target = event.target instanceof Node ? event.target : null
            if (!begun || !target || !view.editable) return
            const moved =
              Math.hypot(event.clientX - begun.x, event.clientY - begun.y) > 4
            // A double click's second would reopen what its first closed.
            const again = event.detail > 1
            if (moved || again || !(begun.mouse || begun.selected)) return
            const at = atomAt(view, target, types)
            if (at === null) return
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, at)
              )
            )
            const name = view.state.doc.nodeAt(at)!.type.name
            // After the click this release makes, which a popover would
            // otherwise hear as a press outside it.
            pending = setTimeout(() => onEdit(name))
          }
          view.dom.addEventListener('pointerdown', pointerdown)
          view.dom.addEventListener('mouseup', release)
          return {
            destroy: () => {
              clearTimeout(pending)
              view.dom.removeEventListener('pointerdown', pointerdown)
              view.dom.removeEventListener('mouseup', release)
            }
          }
        }
      })
    ]
  }
})
