import { Node } from '@tiptap/core'

import { isSafeImageSrc } from './imageSrc'

export type ImageAttrs = { src: string; alt?: string }

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /** Inserts an image at the selection, refusing a src other than https or root-relative. */
      setImage: (attrs: ImageAttrs) => ReturnType
    }
  }
}

export const Image = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('alt') ?? ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          isSafeImageSrc(element.getAttribute('src')) ? null : false
      }
    ]
  },

  renderHTML({ node }) {
    return ['img', { src: node.attrs.src, alt: node.attrs.alt }]
  },

  addCommands() {
    return {
      setImage:
        ({ src, alt = '' }) =>
        ({ commands }) =>
          isSafeImageSrc(src) &&
          commands.insertContent({ type: this.name, attrs: { src, alt } })
    }
  }
})
