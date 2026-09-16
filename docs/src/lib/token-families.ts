import type { TokenFamily } from '@roadie-core/tokens'

export type DocLink = { title: string; href: string }

export type TokenFamilyPage = DocLink & {
  /** Words a search should match that the token names don't contain. */
  aliases: string
  guidance: DocLink[]
}

const foundation = (title: string, slug: string): DocLink => ({
  title,
  href: `/foundations/${slug}`
})

/** Every token family, in reading order, with the Foundations pages that say when to use it. */
export const TOKEN_FAMILY_PAGES: Record<TokenFamily, TokenFamilyPage> = {
  'color-scales': {
    title: 'Color scales',
    href: '/tokens/color-scales',
    aliases: 'palette oklch hue chroma swatch illustration',
    guidance: [foundation('Colors', 'colors'), foundation('Theming', 'theming')]
  },
  intents: {
    title: 'Intents',
    href: '/tokens/intents',
    aliases: 'semantic background text border color role',
    guidance: [foundation('Colors', 'colors')]
  },
  emphasis: {
    title: 'Emphasis and states',
    href: '/tokens/emphasis',
    aliases: 'surface preset hover active focus disabled field translucent',
    guidance: [
      foundation('Colors', 'colors'),
      foundation('Interactions', 'interactions'),
      foundation('Accessibility', 'accessibility')
    ]
  },
  typography: {
    title: 'Typography',
    href: '/tokens/typography',
    aliases: 'font size heading display body leading tracking',
    guidance: [foundation('Typography', 'typography')]
  },
  elevation: {
    title: 'Elevation and layering',
    href: '/tokens/elevation',
    aliases: 'shadow depth rim light z-index stacking',
    guidance: [foundation('Elevation', 'elevation')]
  },
  shape: {
    title: 'Shape and layout',
    href: '/tokens/shape',
    aliases: 'radius rounded corner container width',
    guidance: [foundation('Shape', 'shape'), foundation('Layout', 'layout')]
  },
  motion: {
    title: 'Motion',
    href: '/tokens/motion',
    aliases: 'animation transition duration easing spring',
    guidance: [
      foundation('Motion', 'motion'),
      foundation('View transitions', 'view-transitions')
    ]
  },
  'component-utilities': {
    title: 'Component utilities',
    href: '/tokens/component-utilities',
    aliases: 'button calendar tile variant template',
    guidance: [
      foundation('Date and time', 'date-and-time'),
      foundation('App shell', 'app-shell')
    ]
  }
}

export const TOKEN_FAMILY_ORDER = Object.keys(
  TOKEN_FAMILY_PAGES
) as TokenFamily[]

/** The cross-links shown under a page's title: guidance for a token family, the reference for a foundation. */
export function relatedLinks(
  pathname: string
): { label: string; links: DocLink[] } | null {
  const family = Object.values(TOKEN_FAMILY_PAGES).find(
    (page) => page.href === pathname
  )
  if (family) return { label: 'Guidance', links: family.guidance }

  const references = Object.values(TOKEN_FAMILY_PAGES)
    .filter((page) => page.guidance.some((link) => link.href === pathname))
    .map(({ title, href }) => ({ title: `${title} tokens`, href }))
  return references.length > 0
    ? { label: 'Reference', links: references }
    : null
}

/** One line under a group's heading, for groups whose tokens carry no comment of their own. */
export const GROUP_NOTES: Record<string, string> = {
  'Pinned light steps':
    'Light values that stay light in dark mode, for marks and illustrations.',
  Illustration: 'Fixed spot illustration colours; they ignore dark mode.',
  'Accent parameters':
    'The hue and chroma the accent and neutral scales are built from.',
  Backgrounds: 'Surface roles, read by the bg-* utilities.',
  Text: 'Foreground roles, read by the text-* utilities.',
  Borders: 'Edge roles, read by the border-* and divide-* utilities.',
  Mark: 'Highlight colours for mark and search matches.',
  'Semantic utilities': 'The Tailwind classes that read the roles above.',
  'Raw steps':
    "The active intent's 14 scale steps, for states a role doesn't cover.",
  'Alpha steps': 'Translucent steps that read on any surface.',
  'Intent utilities': 'Point every role at one scale; children inherit it.',
  'Emphasis presets':
    'Background, text, border and shadow in one class. Add is-interactive for states.',
  'Interaction states':
    'Hover, press, focus ring and disabled. Fields shift neutral, then accent, then danger.',
  'Font size line heights':
    'Size classes set no line height, so pair them with leading-*.',
  'Display styles':
    'Size, weight, leading and tracking for headings, in UI and prose flavours.',
  'Body styles': 'Composed body text for interfaces, prose and code.',
  Shadows: 'Tinted by the surrounding intent. Inset shadows recess a surface.',
  'Rim light': 'A top-edge highlight that lifts a raised or strong surface.',
  Layering: 'Named stacking tiers; use z-popover, never a raw number.',
  Animations:
    'Play once when the class is applied. Press a preview to replay it.',
  'Enter and exit transitions':
    'Driven by data-starting-style and data-ending-style. Press a preview to toggle it.',
  Keyframes: 'The keyframes the animation classes run.',
  Buttons: 'Pair btn with a size, an intent and an emphasis.',
  'Calendar tile':
    'A month and day tile for templates; the parts are dimmed to show which one a class styles.'
}
