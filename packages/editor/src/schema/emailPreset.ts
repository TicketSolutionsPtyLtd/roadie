import { Extension, type Extensions, Node } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, starterKitOptions } from './basicPreset'
import {
  SPACER_HEIGHT,
  buttonLook,
  columnsLook,
  imageLook,
  imageWidth,
  isEmailHref,
  isEmailImageSrc,
  spacerHeight,
  textAlign
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
export const Columns = layoutNode('columns', LAYOUT, 'column{2,4}').extend({
  addAttributes: () => ({
    layout: {
      default: undefined,
      parseHTML: (element: HTMLElement) =>
        columnsLook({ layout: element.getAttribute('data-layout') }).layout,
      renderHTML: ({ layout }: Record<string, unknown>) =>
        layout ? { 'data-layout': String(layout) } : {}
    },
    stack: {
      default: undefined,
      parseHTML: (element: HTMLElement) =>
        columnsLook({ stack: element.getAttribute('data-stack') }).stack,
      renderHTML: ({ stack }: Record<string, unknown>) =>
        stack ? { 'data-stack': String(stack) } : {}
    }
  }),
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    { ...HTMLAttributes, 'data-type': 'columns' },
    0
  ]
})

// A heading or paragraph centred, from its data attribute alone.
const TextAlign = Extension.create({
  name: 'textAlign',
  addGlobalAttributes: () => [
    {
      types: ['paragraph', 'heading'],
      attributes: {
        align: {
          default: undefined,
          parseHTML: (element: HTMLElement) =>
            textAlign(element.getAttribute('data-align')),
          renderHTML: ({ align }: Record<string, unknown>) =>
            align ? { 'data-align': String(align), class: 'text-center' } : {}
        }
      }
    }
  ]
})
export const Column = layoutNode(
  'column',
  undefined,
  `(block | ${EMAIL_BLOCK})+`
)

// Blank is no attr, as `migrate` reads it.
function textAttr(element: HTMLElement, name: string) {
  const value = element.getAttribute(name)
  return value?.trim() ? value : undefined
}

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
          const key = textAttr(element, 'data-key')?.trim()
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
    return {
      href: { default: undefined },
      // From its data attributes only, as Tiptap reads a bare one by default.
      variable: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-variable') ?? undefined
      },
      align: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          buttonLook({ align: element.getAttribute('data-align') }).align
      },
      emphasis: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          buttonLook({ emphasis: element.getAttribute('data-emphasis') })
            .emphasis
      },
      fullWidth: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-full-width') === null ? undefined : true
      },
      ...showWhen
    }
  },
  parseHTML() {
    // Above the link mark's rule, which would otherwise read it as linked text.
    return [
      {
        tag: 'a[data-type="button"]',
        priority: 60,
        getAttrs: (element) => {
          const href = element.getAttribute('href')
          const variable = element.getAttribute('data-variable')
          if (!variable && !isEmailHref(href)) return false
          return variable ? { variable } : { href }
        }
      }
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    const { align, emphasis, fullWidth } = buttonLook(node.attrs)
    return [
      'a',
      {
        'data-type': 'button',
        ...(node.attrs.variable
          ? { 'data-variable': node.attrs.variable }
          : { href: node.attrs.href }),
        ...(align && { 'data-align': align }),
        ...(emphasis && { 'data-emphasis': emphasis }),
        ...(fullWidth && { 'data-full-width': '' }),
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
      // From data attributes alone, as Tiptap reads a bare one by default.
      align: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          imageLook({ align: element.getAttribute('data-align') }).align
      },
      href: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          imageLook({ href: element.getAttribute('data-href') }).href
      },
      variable: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-variable') ?? undefined
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
    const { align, href, variable } = imageLook(node.attrs)
    return [
      'img',
      {
        src,
        alt,
        ...(width && { width }),
        ...(align && { 'data-align': align }),
        ...(href && { 'data-href': href }),
        ...(variable && { 'data-variable': variable }),
        ...shownWhen(HTMLAttributes)
      }
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

// A link to a link variable, such as the unsubscribe page, has no href: the
// email writes the sending system's token there.
const EmailLink = SafeLink.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Undefined, not null, so a variable link saves without an href.
      href: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('href') ?? undefined
      },
      variable: {
        default: undefined,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-variable') || undefined,
        renderHTML: ({ variable }: Record<string, unknown>) =>
          variable ? { 'data-variable': String(variable) } : {}
      }
    }
  },
  parseHTML() {
    return [...(this.parent?.() ?? []), { tag: 'a[data-variable]' }]
  },
  // Link checks the href it draws, which a variable link doesn't have.
  renderHTML(props) {
    const { variable } = props.mark.attrs
    return variable
      ? ['a', { 'data-variable': String(variable) }, 0]
      : this.parent!(props)
  }
})

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
export const email: Extensions = [
  StarterKit.configure({
    ...starterKitOptions,
    document: false,
    blockquote: false,
    heading: false,
    horizontalRule: false
  }),
  EmailDoc,
  RichHeading,
  TextAlign,
  EmailLink,
  Section,
  Columns,
  Column,
  Button,
  EmailImage,
  Spacer,
  Divider,
  Variable
]
