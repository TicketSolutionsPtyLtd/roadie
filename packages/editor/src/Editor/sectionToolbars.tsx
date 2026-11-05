'use client'

import {
  EyeSlashIcon,
  SlidersHorizontalIcon,
  WarningIcon
} from '@phosphor-icons/react'
import { Extension } from '@tiptap/core'
import {
  type EditorState,
  NodeSelection,
  Plugin,
  PluginKey
} from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createRoot } from 'react-dom/client'

import { Badge } from '@oztix/roadie-components/badge'
import { IconButton } from '@oztix/roadie-components/button'

import { type ShowWhen, showWhenLabel, showWhenRule } from '../schema/showWhen'
import type { EditorVariable } from '../schema/variables'

type SectionToolbarOptions = {
  variables: () => readonly EditorVariable[] | undefined
  /** Opens the settings of the section starting at `pos`. */
  onSettings: (pos: number) => void
}

type Shown = {
  rule?: ShowWhen
  /** The rule's merge tag, or undefined when the email doesn't list it. */
  label?: string
  open: () => void
}

function SectionToolbar({ rule, label, open }: Shown) {
  const unknown = rule && label === undefined
  return (
    <div className='flex items-center gap-1'>
      {rule ? (
        <Badge
          intent={unknown ? 'warning' : 'info'}
          emphasis='subtle'
          size='sm'
          title={
            unknown
              ? `${rule.key} isn’t one of this email’s merge tags, so it can’t send.`
              : undefined
          }
        >
          {unknown ? (
            <WarningIcon weight='bold' aria-hidden />
          ) : (
            <EyeSlashIcon weight='bold' aria-hidden />
          )}
          {unknown
            ? `${showWhenLabel(rule)} · unknown merge tag`
            : showWhenLabel(rule, label)}
        </Badge>
      ) : null}
      <IconButton
        size='xs'
        emphasis='normal'
        aria-label='Section settings'
        tabIndex={-1}
        data-slot='editor-section-settings'
        // A press would otherwise move the caret before the click.
        onMouseDown={(event) => event.preventDefault()}
        onClick={open}
      >
        <SlidersHorizontalIcon weight='bold' className='size-4' aria-hidden />
      </IconButton>
    </div>
  )
}

const roots = new WeakMap<Node, { unmount: () => void }>()

// The top-level section holding the caret, or selected whole.
function activeSection({ selection }: EditorState) {
  if (selection instanceof NodeSelection && selection.$from.depth === 0) {
    return selection.from
  }
  return selection.$from.depth > 0 ? selection.$from.before(1) : null
}

/**
 * Gives each section a small toolbar on its top edge: Settings, shown while
 * it's hovered or holds the caret, and a badge reading its rule, always
 * shown, so who it's for isn't hidden.
 */
export const SectionToolbars = Extension.create<SectionToolbarOptions>({
  name: 'sectionToolbars',
  addProseMirrorPlugins() {
    const { variables, onSettings } = this.options
    const labelOf = (key: string) =>
      variables()?.find((variable) => variable.key === key)?.label
    return [
      new Plugin({
        key: new PluginKey('sectionToolbars'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            const active = activeSection(state)
            // Sections sit only at the top, so nothing inside is read.
            state.doc.forEach((node, pos) => {
              if (node.type.name !== 'section') return
              const rule = showWhenRule(node.attrs.showWhen)
              const label = rule && labelOf(rule.key)
              // A mark on the section, not the toolbar's key, so moving the
              // caret never rebuilds a toolbar.
              if (pos === active) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    'data-section-active': ''
                  })
                )
              }
              // At the section's end, inside it, so no block moves for it.
              decorations.push(
                Decoration.widget(
                  pos + node.nodeSize - 1,
                  (view, getPos) => {
                    const dom = document.createElement('div')
                    dom.dataset.slot = 'editor-section-toolbar'
                    dom.contentEditable = 'false'
                    dom.className = 'absolute -top-3 end-3 z-1'
                    // The canvas spaces a section's children with margins,
                    // which would move it.
                    dom.style.margin = '0'
                    const open = () => {
                      const at = getPos()
                      if (at !== undefined) {
                        onSettings(view.state.doc.resolve(at).before(1))
                      }
                    }
                    const root = createRoot(dom)
                    root.render(
                      <SectionToolbar rule={rule} label={label} open={open} />
                    )
                    roots.set(dom, root)
                    return dom
                  },
                  {
                    key: `section-toolbar:${JSON.stringify(rule ?? null)}:${label}`,
                    side: 1,
                    ignoreSelection: true,
                    stopEvent: () => true,
                    destroy: (dom) => {
                      // React can't unmount a root while it's rendering.
                      const root = roots.get(dom)
                      queueMicrotask(() => root?.unmount())
                    }
                  }
                )
              )
            })
            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})
