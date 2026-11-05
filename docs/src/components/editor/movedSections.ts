const PAGES = {
  'basic-and-rich': [
    ['with-content', 'default'],
    'links',
    'rich-preset',
    'images',
    'embeds',
    'tables'
  ],
  blocks: [
    ['blocks-preset', 'default'],
    'inserting-blocks',
    ['slash-menu', 'inserting-blocks'],
    'block-handle',
    'custom-blocks'
  ],
  email: [
    ['email-preset', 'default'],
    'composing-a-layout',
    'buttons-columns-and-spacers',
    'sending-email',
    'html-emails',
    'merge-tags',
    'conditions',
    // The page once had two Conditions sections, so the second took this slug.
    ['conditions-1', 'conditions']
  ],
  'saved-content': ['rendering-saved-content', 'importing-existing-html']
} satisfies Record<string, (string | [string, string])[]>

const MOVED = new Map(
  Object.entries(PAGES).flatMap(([page, anchors]) =>
    anchors.map((anchor) => {
      const [from, to] = typeof anchor === 'string' ? [anchor, anchor] : anchor
      return [from, `/components/editor/${page}/#${to}`] as const
    })
  )
)

/** Every old `#anchor` on the Editor page, and where it went. */
export const movedEditorSections = (): [string, string][] => [...MOVED]

/** Where a section that left the Editor page lives now, from its old `#anchor`. */
export function movedEditorSection(hash: string): string | undefined {
  return MOVED.get(hash.replace(/^#/, ''))
}
