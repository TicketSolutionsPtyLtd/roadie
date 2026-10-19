import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

import { type EmbedProvider, parseEmbedUrl } from '../schema/embed'

export type EmbedPasteOptions = {
  /** The latest `embedProviders`, read when a link is pasted. */
  providers: () => readonly EmbedProvider[]
}

/** Embeds a supported link pasted alone on an empty line. */
export const EmbedPaste = Extension.create<EmbedPasteOptions>({
  name: 'embedPaste',
  // Ahead of Link, which would otherwise link the pasted address.
  priority: 1000,

  addOptions() {
    return { providers: () => [] }
  },

  addProseMirrorPlugins() {
    const { providers } = this.options
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const embed = view.state.schema.nodes.embed
            const text = event.clipboardData?.getData('text/plain').trim()
            const { $from, empty } = view.state.selection
            const onEmptyLine =
              empty &&
              $from.parent.type.name === 'paragraph' &&
              $from.parent.content.size === 0
            if (!embed || !text || !onEmptyLine) return false
            const value = parseEmbedUrl(text, providers())
            const fits = $from
              .node(-1)
              .canReplaceWith($from.index(-1), $from.indexAfter(-1), embed)
            if (!value || !fits) return false
            const node = embed.create({ params: null, ...value })
            view.dispatch(
              view.state.tr
                .replaceWith($from.before(), $from.after(), node)
                .scrollIntoView()
            )
            return true
          }
        }
      })
    ]
  }
})
