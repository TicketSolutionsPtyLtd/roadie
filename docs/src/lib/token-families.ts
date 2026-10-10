import type { TokenFamily } from '@roadie-core/tokens'

export type DocLink = { title: string; href: string }

export type TokenFamilyPage = DocLink & {
  /** The page's opening line, with `inline code` in backticks; the markdown twin reuses it. */
  intro: string
  /** Words a search should match that the token names don't contain. */
  aliases: string
  guidance: DocLink[]
}

const foundation = (title: string, slug: string): DocLink => ({
  title,
  href: `/foundations/${slug}`
})

/** All tokens' opening line, which its markdown twin reuses. */
export const ALL_TOKENS_INTRO =
  'Every variable, class, variant and keyframe core ships, generated from its CSS on every build.'

/** Every token family, in reading order, with the Foundations pages that say when to use it. */
export const TOKEN_FAMILY_PAGES: Record<TokenFamily, TokenFamilyPage> = {
  'color-scales': {
    title: 'Color scales',
    href: '/tokens/color-scales',
    intro:
      'Step 0 is the page and step 13 the strongest text; dark mode swaps the values and keeps the step numbers. Neutral and accent follow `--accent-hue`. Brand secondary ships as variables only, with no `bg-*` classes.',
    aliases: 'palette oklch hue chroma swatch illustration',
    guidance: [foundation('Colors', 'colors'), foundation('Theming', 'theming')]
  },
  intents: {
    title: 'Intents',
    href: '/tokens/intents',
    intro:
      'An `intent-*` class points every `--intent-*` role at one scale, and children inherit it. The semantic utilities read those roles, so the same class draws in any intent. Neutral is set on `:root`.',
    aliases: 'semantic background text border color role',
    guidance: [foundation('Colors', 'colors')]
  },
  dataviz: {
    title: 'Data visualisation',
    href: '/tokens/dataviz',
    intro:
      'Every chart colour comes from `palette.ts` in core and is checked for colour-blind separation in CI. Use the CSS variables in dashboards and `@oztix/roadie-core/dataviz` where a renderer can’t read CSS.',
    aliases:
      'chart graph series categorical sequential diverging heat status highlight',
    guidance: [
      { title: 'Data visualisation', href: '/charts/data-visualisation' },
      foundation('Colors', 'colors')
    ]
  },
  emphasis: {
    title: 'Emphasis and states',
    href: '/tokens/emphasis',
    intro:
      'A preset is a whole surface in one class. Add `is-interactive` for hover, press, focus ring and disabled, or `is-interactive-field` on a text field.',
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
    intro:
      'Sizes from `text-lg` up are fluid. A size class sets no line height, so pair it with `leading-*` or use a composed `text-display-*` or `text-ui` style.',
    aliases: 'font size heading display body leading tracking prose',
    guidance: [
      foundation('Typography', 'typography'),
      foundation('Prose styles', 'prose')
    ]
  },
  elevation: {
    title: 'Elevation and layering',
    href: '/tokens/elevation',
    intro:
      'Shadows take their tint from `--intent-hue`, so a danger surface casts a warm shadow. Stack overlays with the named `z-*` tiers, never a raw number.',
    aliases: 'shadow depth rim light z-index stacking',
    guidance: [foundation('Elevation', 'elevation')]
  },
  shape: {
    title: 'Shape and layout',
    href: '/tokens/shape',
    intro:
      "Roadie keeps Tailwind's radius scale and adds `rounded-5xl` to `rounded-7xl` for hero and feature surfaces. `container-*` centres a page at any container width. Spacing utilities multiply `--spacing`, and the breakpoints set where `sm:` to `2xl:` switch.",
    aliases: 'radius rounded corner container width',
    guidance: [foundation('Shape', 'shape'), foundation('Layout', 'layout')]
  },
  motion: {
    title: 'Motion',
    href: '/tokens/motion',
    intro:
      'Press a preview to play it. Colour and opacity use the standard curves; transforms use `--ease-spring`. Under reduced motion every duration drops to near zero.',
    aliases: 'animation transition duration easing spring',
    guidance: [
      foundation('Motion', 'motion'),
      foundation('View transitions', 'view-transitions')
    ]
  },
  'component-utilities': {
    title: 'Component utilities',
    href: '/tokens/component-utilities',
    intro:
      'The same styles the React components apply, for server-rendered and Vue templates. Pair `btn` with a size, an intent and an emphasis.',
    aliases: 'button calendar tile variant template',
    guidance: [
      foundation('Date and time', 'date-and-time'),
      foundation('Navigation', 'navigation')
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
  Prose:
    'The .prose class, and the variables that set its size, rhythm, measure, and headings.',
  Shadows: 'Tinted by the surrounding intent. Inset shadows recess a surface.',
  'Rim light': 'A top-edge highlight that lifts a raised or strong surface.',
  Sheen: 'The shade and highlight a loading placeholder sweeps between.',
  Layering: 'Named stacking tiers; use z-popover, never a raw number.',
  Spacing: 'The unit that gap-*, p-*, m-*, w-*, and h-* multiply.',
  Breakpoints: 'Viewport widths where the sm: to 2xl: variants switch.',
  Animations:
    'Play once when the class is applied. Press a preview to replay it.',
  'Enter and exit transitions':
    'Driven by data-starting-style and data-ending-style. Press a preview to toggle it.',
  Keyframes: 'The keyframes the animation classes run.',
  Buttons: 'Pair btn with a size, an intent and an emphasis.',
  'Calendar tile':
    'A month and day tile for templates; the parts are dimmed to show which one a class styles.'
}
