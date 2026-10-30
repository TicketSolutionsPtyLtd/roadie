import type { Extensions } from '@tiptap/core'
import { Link } from '@tiptap/extension-link'
import { StarterKit } from '@tiptap/starter-kit'

import { isUnsafeHref } from '@oztix/roadie-core/utils'

// Saved links hold only `href`; how a link opens is the renderer's call.
export const SafeLink = Link.extend({
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

/** StarterKit's options every preset shares. */
export const starterKitOptions = {
  code: false,
  codeBlock: false,
  link: false,
  strike: false,
  // Sortable's drop line: thick, round, and in the accent colour.
  dropcursor: {
    color: false,
    width: 2,
    class:
      'rounded-full intent-accent bg-strong forced-color-adjust-none forced-colors:bg-[Highlight]'
  }
} as const

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
export const basic: Extensions = [
  StarterKit.configure({
    ...starterKitOptions,
    blockquote: false,
    heading: false,
    horizontalRule: false
  }),
  SafeLink
]
