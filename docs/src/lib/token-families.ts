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
