import { describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.guards.css?inline'

// Every filter, backdrop-filter, mask and will-change a package ships is
// listed, with the frame test that covers it: the ticket card's seven chained
// drop-shadows dropped 70.6% of a carousel's frames, and five drop 47%.
// Limits: compiled declarations only, so not inline styles, a filter summed
// across utilities on one element, a variable another rule sets, or mask-border.
type Property = 'filter' | 'backdrop-filter' | 'mask' | 'will-change'
type Site = { property: Property; rule: string; functions: number }
type Allowance = {
  rule: RegExp
  property: Property
  why: string
  cover: string
}

const PROPERTIES = [
  'filter',
  'backdrop-filter',
  'mask',
  'mask-image',
  'will-change'
] as const
const MAX_CHAIN = 3
const ONE_OFF = 'one-off overlay, not repeated'

// The one chain over three. #994 removes it (INNO-1658, INNO-1674); whoever
// lands that deletes this exception, as 'lists nothing that no longer ships' says.
const TICKET_CHAIN: Site = {
  property: 'filter',
  rule: '[data-slot="card"][data-variant="ticket"]',
  functions: 7
}

const ALLOWED: Allowance[] = [
  {
    rule: /^\.is-interactive(-field(-group)?)? &:disabled, &\[data-disabled\]$/,
    property: 'filter',
    why: 'core interactions.css: one grayscale() on a disabled control',
    cover:
      'none; 600 disabled controls dropped no frames in the INNO-1649 audit'
  },
  {
    rule: /^\.(blur|invert)$/,
    property: 'filter',
    why: 'words in source that Tailwind reads as classes; no element has them',
    cover: 'nothing to cover'
  },
  {
    rule: /^\.drop-shadow-sm$/,
    property: 'filter',
    why: 'NumberField/NumberFieldScrubAreaCursor.tsx: the cursor while scrubbing',
    cover: ONE_OFF
  },
  {
    rule: /group-data-busy.+(brightness-50|saturate-40)\)$/,
    property: 'filter',
    why: 'FileUpload/FileUploadItemPreview.tsx: a thumbnail dims as it uploads',
    cover: 'FileUpload.perf: six thumbnails dim while their uploads progress'
  },
  {
    rule: /^\.data-disabled.+grayscale-30\[data-disabled\]$/,
    property: 'filter',
    why: 'editor Editor/variants.ts: one grayscale() on a disabled editor',
    cover: 'none; the editor has no frame tests (INNO-1694)'
  },
  {
    rule: /^\.emphasis-overlay$/,
    property: 'backdrop-filter',
    why: 'core emphasis.css: the scrim behind a dialog, drawer or cart',
    cover: `Dialog.perf and Drawer.perf, which excuse it; ${ONE_OFF}`
  },
  {
    rule: /^\.is-translucent /,
    property: 'backdrop-filter',
    why: 'core emphasis.css: raised and floating chrome, as menus and tab bars',
    cover: 'Menu.perf and Navigator.perf'
  },
  {
    rule: /^\.backdrop-blur-md$/,
    property: 'backdrop-filter',
    why: 'Pane/variants.ts: sticky pane chrome; INNO-1676 moves it to is-translucent',
    cover: 'Navigator.perf; INNO-1659 adds a scroll under it'
  },
  {
    rule: /^\.backdrop-blur-sm$/,
    property: 'backdrop-filter',
    why: 'widgets CartEventGroup (.tsx and .vue): the veil on a group being removed',
    cover: ONE_OFF
  },
  {
    rule: /^\.(data-\\\[orientation\S+:)?\\\[mask-image\\:linear-gradient\S+--(scroll-area|toggle-group)-fade-/,
    property: 'mask',
    why: 'ScrollArea/variants.ts and ToggleGroup/variants.ts: a faded scroll edge',
    cover: 'Toolbar.perf, a faded ScrollArea; none for ToggleGroup’s own'
  },
  {
    rule: /^\[data-slot="card"\]\[data-variant="ticket"\] > \*$/,
    property: 'mask',
    why: 'components card-ticket.css: the notches where corner-shape is missing',
    cover: 'none; Chromium never draws it, so it takes a WebKit run'
  },
  {
    rule: /^\[data-slot="collapsible-text-content"\] &\[data-clamped\]\[data-overflowing\]$/,
    property: 'mask',
    why: 'components collapsible-text.css: the fade on the last clamped line',
    cover: 'none'
  },
  {
    rule: /^\.will-change-transform$/,
    property: 'will-change',
    why: 'ImageCrop/ImageCropStage.tsx: the one image dragged under the crop',
    cover: 'ImageCrop.perf'
  },
  {
    rule: /^:where\(\[data-dragging\]\) /,
    property: 'will-change',
    why: 'Calendar/Calendar.tsx: the month strips, only while a finger drags them',
    cover: 'Calendar.perf'
  },
  {
    rule: /^\[data-slot="navigator-pending"\]::before$/,
    property: 'will-change',
    why: 'components navigator-pending.css: the spinner on one pending link',
    cover: 'one at a time, not repeated'
  }
]

// How many functions a value chains. Tailwind builds a filter from variables
// the same rule sets, so each is read in place; one set elsewhere counts once.
function functionsIn(style: CSSStyleDeclaration, value: string) {
  const chain = value.replace(
    /var\((--[\w-]+)(,\s*)?\)/g,
    (whole, name: string, empty?: string) =>
      style.getPropertyValue(name) || (empty ? '' : whole)
  )
  let depth = 0
  let count = 0
  for (const char of chain) {
    if (char === '(' && depth++ === 0) count += 1
    else if (char === ')') depth -= 1
  }
  return count
}

/** Each rule that sets one of the properties to something that costs. */
function sitesIn(css: string) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  const sites = new Map<string, Site>()
  const read = (style: CSSStyleDeclaration, rule: string) => {
    for (const name of PROPERTIES) {
      const value = (
        style.getPropertyValue(name) ||
        style.getPropertyValue(`-webkit-${name}`)
      ).trim()
      const functions = functionsIn(style, value)
      const property = name === 'mask-image' ? 'mask' : name
      const layer = name === 'will-change' && value !== '' && value !== 'auto'
      // A media query or a later keyframe can set it again: the longest counts.
      const key = `${property} ${rule}`
      const most = Math.max(functions, sites.get(key)?.functions ?? 0)
      if (functions || layer)
        sites.set(key, { property, rule, functions: most })
    }
  }
  const walk = (rules: CSSRuleList, scope: string) => {
    for (const rule of rules) {
      // Declarations after a nested rule sit in a rule with no selector.
      const { selectorText, style, cssRules } = rule as Partial<CSSStyleRule>
      const label =
        rule instanceof CSSKeyframesRule
          ? `@keyframes ${rule.name}`
          : selectorText
      const within = label ? `${scope} ${label}`.trim() : scope
      if (style) read(style, within)
      if (cssRules) walk(cssRules, within)
    }
  }
  walk(sheet.cssRules, '')
  return [...sites.values()]
}

const isTicketChain = (site: Site) =>
  site.property === TICKET_CHAIN.property &&
  site.rule === TICKET_CHAIN.rule &&
  site.functions <= TICKET_CHAIN.functions

const allowanceFor = (site: Site) =>
  ALLOWED.find(
    ({ rule, property }) => property === site.property && rule.test(site.rule)
  )

const unlisted = (sites: Site[]) =>
  sites.filter((site) => !isTicketChain(site) && !allowanceFor(site))

const longChains = (sites: Site[]) =>
  sites.filter(
    (site) =>
      site.property !== 'mask' &&
      site.functions > MAX_CHAIN &&
      !isTicketChain(site)
  )

describe('Roadie CSS and paint cost', () => {
  it('reads what a rule costs, through nesting and Tailwind’s variables', () => {
    const sites = sitesIn(`
      .chain { filter: blur(1px) blur(1px) blur(1px) blur(1px) }
      @media print { .chain { filter: blur(1px) } }
      .held { --held: blur(1px) blur(1px) blur(1px) blur(1px); filter: var(--held) }
      .veil { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px) }
      .tw { --tw-blur: blur(8px); filter: var(--tw-blur,) var(--tw-invert,) }
      .nest { @media (width > 0) { .in { color: red } mask: url(a.svg) } }
      .layer { will-change: transform }
      @keyframes glow { to { filter: blur(2px) } }
      .free { filter: none; backdrop-filter: var(--tw-backdrop-blur,);
        mask-image: none; will-change: auto }
    `)

    expect(sites).toEqual([
      { property: 'filter', rule: '.chain', functions: 4 },
      { property: 'filter', rule: '.held', functions: 4 },
      { property: 'backdrop-filter', rule: '.veil', functions: 1 },
      { property: 'filter', rule: '.tw', functions: 1 },
      { property: 'mask', rule: '.nest', functions: 1 },
      { property: 'will-change', rule: '.layer', functions: 0 },
      { property: 'filter', rule: '@keyframes glow', functions: 1 }
    ])
    // A chain of four fails whether or not it is listed.
    expect(longChains(sites).map(({ rule }) => rule)).toEqual([
      '.chain',
      '.held'
    ])
    expect(unlisted(sites)).toEqual(sites)
  })

  it('allows a listed rule only the declaration it names', () => {
    const hover = '.is-interactive { &:hover { filter: blur(1px) } }'
    expect(unlisted(sitesIn(hover))).toHaveLength(1)
  })

  it('ships no filter, backdrop-filter, mask or will-change that isn’t listed', () => {
    expect(unlisted(sitesIn(roadieCss))).toEqual([])
  })

  it('lists nothing that no longer ships', () => {
    const sites = sitesIn(roadieCss)
    const used = new Set(sites.map(allowanceFor))
    expect(ALLOWED.filter((allowance) => !used.has(allowance))).toEqual([])
    // Fails once #994 lands, so the ticket's exception goes with it.
    expect(sites.some(isTicketChain)).toBe(true)
  })

  it('ships no filter chain over three functions', () => {
    expect(longChains(sitesIn(roadieCss))).toEqual([])
  })
})
