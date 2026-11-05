import { type Extensions, Node } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, notInStarterKit } from './basicPreset'
import {
  SPACER_HEIGHT,
  imageWidth,
  isEmailHref,
  isEmailImageSrc,
  spacerHeight
} from './emailAttrs'
import { RichHeading } from './headings'
import { Image } from './image'

// Text blocks stay in StarterKit's `block` group, so a list item, which holds
// `paragraph block*`, never holds a layout or an email block.
const EMAIL_BLOCK = 'emailBlock'
const LAYOUT = 'layout'

const layoutNode = (name: string, group: string | undefined, content: string) =>
  Node.create({
    name,
    group,
    content,
    defining: true,
    isolating: true,
    parseHTML: () => [{ tag: `div[data-type="${name}"]` }],
    renderHTML: () => ['div', { 'data-type': name }, 0]
  })

const EmailDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: `(block | ${EMAIL_BLOCK} | ${LAYOUT})+`
})

export const Section = layoutNode(
  'section',
  LAYOUT,
  `(block | ${EMAIL_BLOCK} | columns)+`
)
export const Columns = layoutNode('columns', LAYOUT, 'column{2,4}')
export const Column = layoutNode(
  'column',
  undefined,
  `(block | ${EMAIL_BLOCK})+`
)

// The label is the button's text, not an attr, so a merge tag can sit in it.
export const Button = Node.create({
  name: 'button',
  group: EMAIL_BLOCK,
  content: 'text*',
  marks: '',
  defining: true,
  addAttributes() {
    return { href: { default: null } }
  },
  parseHTML() {
    // Above the link mark's rule, which would otherwise read it as linked text.
    return [
      {
        tag: 'a[data-type="button"]',
        priority: 60,
        getAttrs: (element) => {
          const href = element.getAttribute('href')
          return isEmailHref(href) ? { href } : false
        }
      }
    ]
  },
  renderHTML({ node }) {
    return ['a', { 'data-type': 'button', href: node.attrs.href }, 0]
  }
})

export const Spacer = Node.create({
  name: 'spacer',
  group: EMAIL_BLOCK,
  atom: true,
  addAttributes() {
    return { height: { default: SPACER_HEIGHT.default } }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="spacer"]',
        getAttrs: (element) => {
          const height = element.getAttribute('data-height')
          return {
            height: spacerHeight(height === null ? null : Number(height))
          }
        }
      }
    ]
  },
  renderHTML({ node }) {
    return [
      'div',
      { 'data-type': 'spacer', 'data-height': String(node.attrs.height) }
    ]
  }
})

// StarterKit's rule sits in `block`, which a list item could hold.
const Divider = Node.create({
  name: 'horizontalRule',
  group: EMAIL_BLOCK,
  parseHTML: () => [{ tag: 'hr' }],
  renderHTML: () => ['hr']
})

// An email loads its images in a mail client, so only https reaches one.
const EmailImage = Image.extend({
  group: EMAIL_BLOCK,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          imageWidth(Number(element.getAttribute('width')))
      }
    }
  },
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          isEmailImageSrc(element.getAttribute('src')) ? null : false
      }
    ]
  },
  renderHTML({ node }) {
    const { src, alt, width } = node.attrs
    return ['img', { src, alt, ...(width && { width }) }]
  },
  addCommands() {
    return {
      setImage:
        ({ src, alt = '' }) =>
        ({ commands }) =>
          isEmailImageSrc(src) &&
          commands.insertContent({ type: this.name, attrs: { src, alt } })
    }
  }
})

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
export const email: Extensions = [
  StarterKit.configure({
    ...notInStarterKit,
    document: false,
    blockquote: false,
    heading: false,
    horizontalRule: false
  }),
  EmailDoc,
  RichHeading,
  SafeLink,
  Section,
  Columns,
  Column,
  Button,
  EmailImage,
  Spacer,
  Divider
]
