import { Node } from '@tiptap/core'

import { pageImageLook } from './imageAttrs'
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
      },
      // From data attributes alone, as Tiptap reads a bare one by default.
      fullWidth: {
        default: undefined,
        parseHTML: (element) =>
          element.getAttribute('data-full-width') === null ? undefined : true
      },
      align: {
        default: undefined,
        parseHTML: (element) =>
          pageImageLook({ align: element.getAttribute('data-align') }).align
      },
      caption: {
        default: undefined,
        parseHTML: (element) =>
          pageImageLook({ caption: element.getAttribute('data-caption') })
            .caption
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
    const { fullWidth, align, caption } = pageImageLook(node.attrs)
    return [
      'img',
      {
        src: node.attrs.src,
        alt: node.attrs.alt,
        ...(fullWidth && { 'data-full-width': '' }),
        ...(align && { 'data-align': align }),
        ...(caption && { 'data-caption': caption })
      }
    ]
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
