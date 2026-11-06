import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

type Attrs = Record<string, unknown>

// Every text an attr holds, by its path, such as `cards.1.title`.
function textsOf(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string')
    return value.trim() ? [[path, value.trim()]] : []
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => textsOf(item, `${path}.${index}`))
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) =>
      textsOf(item, `${path}.${key}`)
    )
  }
  return []
}

/**
 * The setting a click at (x, y) on a block meant, by its path: the innermost
 * element there whose text is one of its attrs, such as a card's title. A
 * block may draw its content inert, so the click's target can't tell.
 */
export function clickedSetting(
  block: Element,
  x: number,
  y: number,
  attrs: Readonly<Attrs>
): string | undefined {
  const texts = Object.entries(attrs).flatMap(([key, value]) =>
    textsOf(value, key)
  )
  const under = [...block.querySelectorAll('*')].filter((element) => {
    const box = element.getBoundingClientRect()
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
  })
  const all = [...block.querySelectorAll('*')]
  // Later in document order is deeper, so the innermost match wins.
  for (const element of under.reverse()) {
    const text = element.textContent?.trim()
    const matches = texts.filter(([, value]) => value === text)
    if (!text || matches.length === 0) continue
    // Two items can share text, so the one clicked is told by its place
    // among the elements showing that text, in document order.
    const twins = all.filter(
      (other) =>
        other.textContent?.trim() === text &&
        ![...other.children].some((child) => child.textContent?.trim() === text)
    )
    // Only items of one list are told apart by place; text shared with
    // another attr can't be, so the first match stands.
    const lists = new Set(matches.map(([path]) => path.split('.')[0]))
    const nth = lists.size === 1 ? twins.indexOf(element) : -1
    return (matches[nth] ?? matches[0])![0]
  }
  return undefined
}

const FIELD = 'input, textarea, select, button, [contenteditable="true"]'

type BlockClickOptions = {
  hasSettings: (name: string) => boolean
  /** Opens the selected block's settings, at the path clicked if any. */
  onEdit: (path: string | undefined) => void
}

/**
 * With a mouse, a click on any block with settings opens them at the text
 * clicked, as Framer and Webflow do. A touch only selects, so a scroll never
 * opens them, and a press in a block's own field stays there.
 */
export const BlockClick = Extension.create<BlockClickOptions>({
  name: 'blockClick',
  addProseMirrorPlugins() {
    const { hasSettings, onEdit } = this.options
    // The press, by mouse, that a release must end where it began; a touch
    // laptop's primary pointer is a mouse, so it's the press's own pointer.
    let press: { x: number; y: number } | null = null
    let pending: ReturnType<typeof setTimeout> | undefined
    // A block's own view takes its presses, so the click is read from the
    // DOM: the block with settings holding the target, if any.
    const open = (view: EditorView, event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      // The editor is contenteditable itself, so only a field inside counts.
      const field = target?.closest(FIELD)
      const inField = field && field !== view.dom
      const begun = press
      press = null
      // Moved, so it's a drag that selects text, not a click.
      const moved =
        !begun ||
        Math.hypot(event.clientX - begun.x, event.clientY - begun.y) > 4
      if (!target || moved || !view.editable || inField) return false
      let at: number | undefined
      view.state.doc.descendants((node, pos) => {
        if (at !== undefined) return false
        const dom = view.nodeDOM(pos)
        if (!(dom instanceof Element) || !dom.contains(target)) return false
        if (node.isAtom && hasSettings(node.type.name)) at = pos
        return true
      })
      if (at === undefined) return false
      const node = view.state.doc.nodeAt(at)!
      const dom = view.nodeDOM(at) as Element
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, at))
      )
      const path = clickedSetting(dom, event.clientX, event.clientY, node.attrs)
      // After the click this release makes, which a drawer with a backdrop
      // would otherwise hear as a press outside it.
      pending = setTimeout(() => onEdit(path))
      return true
    }
    return [
      // Listened for on the editor itself, as a block's view stops its own
      // events before ProseMirror's handlers hear them.
      new Plugin({
        view: (view) => {
          const pointerdown = (event: PointerEvent) => {
            const plain =
              event.pointerType === 'mouse' &&
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey
            press = plain ? { x: event.clientX, y: event.clientY } : null
          }
          // On release, as ProseMirror's own clicks are. A double click's
          // second release opens it again after its first press closed it.
          const release = (event: MouseEvent) => {
            if (event.button === 0) open(view, event)
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
