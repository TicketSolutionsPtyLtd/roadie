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
import { showWhenRule } from './showWhen'

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

function pastedRule(element: HTMLElement) {
  try {
    return showWhenRule(JSON.parse(element.getAttribute('data-show-when')!))
  } catch {
    return undefined
  }
}

// Undefined, not null, so a block with no rule saves what it did before rules.
const showWhen = {
  showWhen: {
    default: undefined,
    parseHTML: pastedRule,
    renderHTML: ({ showWhen: rule }: Record<string, unknown>) =>
      rule ? { 'data-show-when': JSON.stringify(rule) } : {}
  }
}

const shownWhen = ({ 'data-show-when': rule }: Record<string, unknown>) =>
  rule ? { 'data-show-when': String(rule) } : {}

const EmailDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: `(block | ${EMAIL_BLOCK} | ${LAYOUT})+`
})

export const Section = layoutNode(
  'section',
  LAYOUT,
  `(block | ${EMAIL_BLOCK} | columns)+`
).extend({
  addAttributes: () => showWhen,
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    { 'data-type': 'section', ...shownWhen(HTMLAttributes) },
    0
  ]
})
export const Columns = layoutNode('columns', LAYOUT, 'column{2,4}')
export const Column = layoutNode(
  'column',
  undefined,
  `(block | ${EMAIL_BLOCK})+`
)

const textAttr = (element: HTMLElement, name: string) =>
  element.getAttribute(name) || undefined

/**
 * A merge tag, saved as its key alone: the sending system's syntax is
 * chosen when the email renders.
 */
export const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    // Undefined, not null, so a value saves no fallback key it doesn't have.
    return {
      key: { default: undefined },
      fallback: { default: undefined }
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
        getAttrs: (element) => {
          const key = textAttr(element, 'data-key')
          return key
            ? { key, fallback: textAttr(element, 'data-fallback') }
            : false
        }
      }
    ]
  },
  renderHTML({ node }) {
    const { key, fallback } = node.attrs
    return [
      'span',
      {
        'data-type': 'variable',
        'data-key': key,
        ...(fallback && { 'data-fallback': fallback })
      },
      String(key)
    ]
  }
})

// The label is the button's text, not an attr, so a merge tag can sit in it.
export const Button = Node.create({
  name: 'button',
  group: EMAIL_BLOCK,
  content: '(text | variable)*',
  marks: '',
  defining: true,
  addAttributes() {
    return { href: { default: null }, ...showWhen }
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
  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      {
        'data-type': 'button',
        href: node.attrs.href,
        ...shownWhen(HTMLAttributes)
      },
      0
    ]
  }
})

export const Spacer = Node.create({
  name: 'spacer',
  group: EMAIL_BLOCK,
  atom: true,
  addAttributes() {
    return { height: { default: SPACER_HEIGHT.default }, ...showWhen }
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
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      {
        'data-type': 'spacer',
        'data-height': String(node.attrs.height),
        ...shownWhen(HTMLAttributes)
      }
    ]
  }
})

// StarterKit's rule sits in `block`, which a list item could hold.
const Divider = Node.create({
  name: 'horizontalRule',
  group: EMAIL_BLOCK,
  addAttributes: () => showWhen,
  parseHTML: () => [{ tag: 'hr' }],
  renderHTML: ({ HTMLAttributes }) => ['hr', shownWhen(HTMLAttributes)]
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
      },
      ...showWhen
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
  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, width } = node.attrs
    return [
      'img',
      { src, alt, ...(width && { width }), ...shownWhen(HTMLAttributes) }
    ]
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
  Divider,
  Variable
]
