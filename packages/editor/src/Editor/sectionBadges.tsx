'use client'

import { EyeSlashIcon } from '@phosphor-icons/react'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createRoot } from 'react-dom/client'

import { Badge } from '@oztix/roadie-components/badge'

import { showWhenLabel, showWhenRule } from '../schema/showWhen'
import type { EditorVariable } from '../schema/variables'

type SectionBadgesOptions = {
  variables: () => readonly EditorVariable[] | undefined
}

function badge(label: string) {
  const dom = document.createElement('span')
  dom.dataset.slot = 'editor-show-when'
  dom.contentEditable = 'false'
  // On the section's top edge, as a tab, so it takes no room from the email.
  dom.className = 'absolute -top-2.5 end-3'
  const root = createRoot(dom)
  root.render(
    <Badge intent='info' emphasis='subtle' size='sm'>
      <EyeSlashIcon weight='bold' aria-hidden />
      {label}
    </Badge>
  )
  return { dom, root }
}

const roots = new WeakMap<Node, { unmount: () => void }>()

/**
 * Badges each section shown only to some, as its rule reads, so a rule
 * isn't invisible on the canvas.
 */
export const SectionBadges = Extension.create<SectionBadgesOptions>({
  name: 'sectionBadges',
  addProseMirrorPlugins() {
    const { variables } = this.options
    const labelOf = (key: string) =>
      variables()?.find((variable) => variable.key === key)?.label
    return [
      new Plugin({
        key: new PluginKey('sectionBadges'),
        props: {
          decorations: (state) => {
            const widgets: Decoration[] = []
            // Sections sit only at the top, so nothing inside is read.
            state.doc.forEach((node, pos) => {
              if (node.type.name !== 'section') return
              const rule = showWhenRule(node.attrs.showWhen)
              if (!rule) return
              const label = showWhenLabel(rule, labelOf(rule.key))
              // At the section's end, inside it, so no block moves for it.
              widgets.push(
                Decoration.widget(
                  pos + node.nodeSize - 1,
                  () => {
                    const { dom, root } = badge(label)
                    roots.set(dom, root)
                    return dom
                  },
                  {
                    key: `show-when:${label}`,
                    side: 1,
                    ignoreSelection: true,
                    destroy: (dom) => {
                      // React can't unmount a root while it's rendering.
                      const root = roots.get(dom)
                      queueMicrotask(() => root?.unmount())
                    }
                  }
                )
              )
            })
            return DecorationSet.create(state.doc, widgets)
          }
        }
      })
    ]
  }
})
