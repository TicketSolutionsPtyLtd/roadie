import type { Extensions } from '@tiptap/core'
import { Heading } from '@tiptap/extension-heading'
import { Link } from '@tiptap/extension-link'
import { StarterKit } from '@tiptap/starter-kit'

import { isUnsafeHref } from '@oztix/roadie-core/utils'

import { Embed } from './embedNode'
import { headingLevel } from './headings'
import { Image } from './image'
import type { Preset } from './presetShapes'

// Saved links hold only `href`; how a link opens is the renderer's call.
const SafeLink = Link.extend({
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('href')
      }
    }
  }
}).configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  isAllowedUri: (url, { defaultValidate }) =>
    defaultValidate(url) && !isUnsafeHref(url),
  shouldAutoLink: (url) =>
    Link.options.shouldAutoLink(url) && !isUnsafeHref(url)
})

// The page owns h1, so pasted h1 becomes h2 and h5 and h6 become h4.
const RichHeading = Heading.extend({
  addAttributes() {
    return { level: { default: 2, rendered: false } }
  },
  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((level) => ({
      tag: `h${level}`,
      attrs: { level: headingLevel(level) }
    }))
  }
}).configure({ levels: [2, 3, 4] })

const notInStarterKit = {
  code: false,
  codeBlock: false,
  link: false,
  strike: false,
  underline: false
} as const

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
const basic: Extensions = [
  StarterKit.configure({
    ...notInStarterKit,
    blockquote: false,
    heading: false,
    horizontalRule: false
  }),
  SafeLink
]

const rich: Extensions = [
  StarterKit.configure({ ...notInStarterKit, heading: false }),
  RichHeading,
  SafeLink,
  Image,
  Embed
]

export const presets = { basic, rich } as const satisfies Record<
  Preset,
  Extensions
>

export type { Preset }
