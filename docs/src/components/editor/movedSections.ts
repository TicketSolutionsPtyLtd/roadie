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
    'slash-menu',
    'block-handle',
    'custom-blocks'
  ],
  email: [
    ['email-preset', 'default'],
    'composing-a-layout',
    'buttons-columns-and-spacers',
    'sending-email',
    'merge-tags',
    'conditions'
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
  return MOVED.get(decodeURIComponent(hash.replace(/^#/, '')))
}
