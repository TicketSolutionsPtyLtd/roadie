import { Node } from '@tiptap/core'

import type { EmbedValue } from './embed'
import { type EmbedAttrs, isTextRecord } from './embedAttrs'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /** Inserts an embed at the selection. */
      setEmbed: (value: EmbedValue) => ReturnType
    }
  }
}

function readParams(element: HTMLElement) {
  try {
    const params: unknown = JSON.parse(element.dataset.params ?? 'null')
    return isTextRecord(params) ? params : null
  } catch {
    return null
  }
}

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: (element) => element.dataset.provider ?? null
      },
      id: { default: null, parseHTML: (element) => element.dataset.id ?? null },
      params: { default: null, parseHTML: readParams }
    }
  },

  // Only the editor's own copy reads back; pasted iframes never become embeds.
  parseHTML() {
    return [{ tag: 'div[data-embed][data-provider][data-id]' }]
  },

  renderHTML({ node }) {
    const { provider, id, params } = node.attrs as EmbedAttrs
    return [
      'div',
      {
        'data-embed': '',
        'data-provider': provider,
        'data-id': id,
        ...(params && { 'data-params': JSON.stringify(params) })
      }
    ]
  },

  addCommands() {
    return {
      setEmbed:
        ({ provider, id, params }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { provider, id, params: params ?? null }
          })
    }
  }
})
