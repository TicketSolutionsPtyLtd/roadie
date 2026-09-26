export const TOKEN_FAMILIES = [
  'color-scales',
  'intents',
  'dataviz',
  'emphasis',
  'typography',
  'elevation',
  'shape',
  'motion',
  'component-utilities'
] as const

export type TokenFamily = (typeof TOKEN_FAMILIES)[number]

export const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const

export type Intent = (typeof INTENTS)[number]

const KIND_ORDER = ['variable', 'utility', 'class', 'variant', 'keyframes']

export type TokenKind =
  'variable' | 'utility' | 'variant' | 'keyframes' | 'class'

type ModeValue = { light?: string; dark?: string }

export type TokenEntry = {
  name: string
  kind: TokenKind
  family: TokenFamily | 'unclassified'
  group: string
  sheet: string
  source: 'roadie' | 'tailwind'
  value?: ModeValue & { fallback?: string }
  resolved?: ModeValue
  byIntent?: Partial<Record<Intent, ModeValue>>
  classes?: string[]
  description?: string
}

export type TokenManifest = {
  generated: string
  tokens: TokenEntry[]
  internal: string[]
}

export type Sheets = [file: string, css: string][]

type Rule = [
  pattern: RegExp,
  family: TokenFamily,
  group: string | ((m: RegExpMatchArray) => string)
]

const SCALES =
  'neutral|brand-secondary|brand|accent|danger|success|warning|info'
const sentence = (s: string) =>
  s[0]!.toUpperCase() + s.slice(1).replace(/-/g, ' ')

const VARIABLE_RULES: Rule[] = [
  [
    new RegExp(`^--color-(${SCALES})-\\d+$`),
    'color-scales',
    (m) => sentence(m[1]!)
  ],
  [
    new RegExp(`^--color-(${SCALES})-light-\\d+$`),
    'color-scales',
    'Pinned light steps'
  ],
  [/^--color-illustration-/, 'color-scales', 'Illustration'],
  [/^--accent-(hue|chroma)$/, 'color-scales', 'Accent parameters'],
  [/^--intent-bg-/, 'intents', 'Backgrounds'],
  [/^--intent-text-/, 'intents', 'Text'],
  [/^--intent-border-/, 'intents', 'Borders'],
  [/^--intent-mark-/, 'intents', 'Mark'],
  [/^--(background|text|border)-color-/, 'intents', 'Semantic utilities'],
  [/^--intent-hue$/, 'intents', 'Hue'],
  [/^--intent-\d+$/, 'intents', 'Raw steps'],
  [/^--intent-\d+a$/, 'intents', 'Alpha steps'],
  [/^--chart-\d$/, 'dataviz', 'Categorical'],
  [/^--chart-(pair|trio)-/, 'dataviz', 'Small sets'],
  [/^--chart-heat-/, 'dataviz', 'Sequential'],
  [/^--chart-diverge-/, 'dataviz', 'Diverging'],
  [/^--chart-status-/, 'dataviz', 'Status'],
  [/^--chart-highlight(-lc)?$/, 'dataviz', 'Highlight'],
  [/^--chart-(context|band|median|other|missing)$/, 'dataviz', 'Data greys'],
  [/^--chart-(grid|axis|label|value|gap)$/, 'dataviz', 'Chart ink'],
  [/^--color-chart-/, 'dataviz', 'Tailwind utilities'],
  [/^--focus-ring-/, 'emphasis', 'Focus ring'],
  [/^--(inset-)?shadow-/, 'elevation', 'Shadows'],
  [/^--rim-light/, 'elevation', 'Rim light'],
  [/^--sheen-/, 'elevation', 'Sheen'],
  [/^--z-index-/, 'elevation', 'Layering'],
  [/^--font-/, 'typography', 'Font families'],
  [/^--text-[^-]+$/, 'typography', 'Font sizes'],
  [/^--text-.+--line-height$/, 'typography', 'Font size line heights'],
  [/^--leading-/, 'typography', 'Line heights'],
  [/^--tracking-/, 'typography', 'Letter spacing'],
  [/^--radius-/, 'shape', 'Radius'],
  [/^--container-/, 'shape', 'Containers'],
  [/^--(transition-)?duration-/, 'motion', 'Durations'],
  [/^--ease-/, 'motion', 'Easings'],
  [/^--interactive-transition$/, 'motion', 'Transitions'],
  [/^--stagger-/, 'motion', 'Stagger']
]

const UTILITY_RULES: Rule[] = [
  [/^intent-/, 'intents', 'Intent utilities'],
  [/^(emphasis-|is-translucent$|is-selected$)/, 'emphasis', 'Emphasis presets'],
  [/^is-interactive/, 'emphasis', 'Interaction states'],
  [/^(inset-)?shadow-/, 'elevation', 'Shadows'],
  [/^rim-light$/, 'elevation', 'Rim light'],
  [/^text-display-/, 'typography', 'Display styles'],
  [/^text-(ui|ui-meta|prose|code)$/, 'typography', 'Body styles'],
  [/^(animate-|motion-[\w]+-(in|out)$)/, 'motion', 'Animations'],
  [
    /^(motion-(scale|slide|drawer)$|is-disclosure-animated$)/,
    'motion',
    'Enter and exit transitions'
  ],
  [/^container-/, 'shape', 'Containers'],
  [/^btn/, 'component-utilities', 'Buttons'],
  [/^calendar-tile/, 'component-utilities', 'Calendar tile']
]

function classify(name: string, rules: Rule[]) {
  for (const [rank, [pattern, family, group]] of rules.entries()) {
    const match = name.match(pattern)
    if (match) {
      const title = typeof group === 'string' ? group : group(match)
      return { family, group: title, rank }
    }
  }
  return { family: 'unclassified' as const, group: 'Unclassified', rank: -1 }
}

const NAMESPACE_CLASSES: [RegExp, (key: string) => string[]][] = [
  [/^--background-color-(.+)$/, (k) => [`bg-${k}`]],
  [/^--text-color-(.+)$/, (k) => [`text-${k}`]],
  [/^--border-color-(.+)$/, (k) => [`border-${k}`, `divide-${k}`]],
  [
    /^--color-(.+)$/,
    (k) => ['bg', 'text', 'border', 'fill', 'stroke'].map((p) => `${p}-${k}`)
  ],
  [/^--radius-(.+)$/, (k) => [`rounded-${k}`]],
  [/^--z-index-(.+)$/, (k) => [`z-${k}`]],
  [/^--ease-(.+)$/, (k) => [`ease-${k}`]],
  [/^--transition-duration-(.+)$/, (k) => [`duration-${k}`]],
  [/^--leading-(.+)$/, (k) => [`leading-${k}`]],
  [/^--tracking-(.+)$/, (k) => [`tracking-${k}`]],
  [/^--font-(.+)$/, (k) => [`font-${k}`]],
  [/^--text-([^-]+)$/, (k) => [`text-${k}`]],
  [/^--container-(.+)$/, (k) => [`container-${k}`, `max-w-${k}`]],
  [/^--shadow-(.+)$/, (k) => [`shadow-${k}`]],
  [/^--inset-shadow-(.+)$/, (k) => [`inset-shadow-${k}`]]
]

function classesFor(name: string) {
  for (const [pattern, toClasses] of NAMESPACE_CLASSES) {
    const key = name.match(pattern)?.[1]
    if (key) return toClasses(key)
  }
  return undefined
}

type Declaration = {
  name: string
  value: string
  sheet: string
  dark: boolean
  modern: boolean
  theme: boolean
  utility?: string
}

type Block = { prelude: string; start: number }

const COMMENT = /\/\*[\s\S]*?\*\//g
const SECTION_RULE = /[─═]/

/** Replaces comments with spaces so offsets still line up with the source. */
const blankComments = (css: string) =>
  css.replace(COMMENT, (c) => c.replace(/[^\n]/g, ' '))

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** The comment that ends right before `offset`, unless it is a section banner. */
function commentBefore(css: string, offset: number) {
  const before = css.slice(0, offset).trimEnd()
  if (!before.endsWith('*/')) return undefined
  const start = before.lastIndexOf('/*')
  const text = squash(before.slice(start + 2, -2))
  return text && !SECTION_RULE.test(text) ? text : undefined
}

function walk(
  sheet: string,
  css: string,
  visit: {
    declaration: (d: Declaration) => void
    block: (prelude: string, offset: number) => void
  }
) {
  const clean = blankComments(css)
  const stack: Block[] = []
  let start = 0

  const flush = (end: number) => {
    const text = clean.slice(start, end).trim()
    const match = text.match(/^(--[\w-]+)\s*:\s*([\s\S]*)$/)
    if (!match || match[1]!.endsWith('-')) return
    const preludes = stack.map((b) => b.prelude)
    visit.declaration({
      name: match[1]!,
      value: squash(match[2]!),
      sheet,
      dark: preludes.some((p) => /(^|\s)\.dark\b/.test(p)),
      modern: preludes.some((p) => p.startsWith('@supports (color: oklch')),
      theme: preludes.some((p) => p.startsWith('@theme')),
      utility: preludes
        .find((p) => p.startsWith('@utility'))
        ?.slice(9)
        .trim()
    })
  }

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (char === '{') {
      const prelude = squash(clean.slice(start, i))
      const offset =
        start +
        (clean.slice(start, i).length -
          clean.slice(start, i).trimStart().length)
      stack.push({ prelude, start: offset })
      visit.block(prelude, offset)
      start = i + 1
    } else if (char === '}') {
      flush(i)
      stack.pop()
      start = i + 1
    } else if (char === ';') {
      flush(i)
      start = i + 1
    }
  }
}

/** The sheets `roadie.css` imports, in cascade order. */
export function sheetOrder(roadieCss: string) {
  return [...roadieCss.matchAll(/@import '\.\/([\w-]+\.css)'/g)].map(
    (m) => m[1]!
  )
}

const SINGLE_VAR = /^var\((--[\w-]+)(?:,\s*[^)]*)?\)$/

export function parseTokenManifest(
  sheets: Sheets,
  tailwindTheme = ''
): TokenManifest {
  const declarations: Declaration[] = []
  const blocks: {
    sheet: string
    prelude: string
    offset: number
    css: string
  }[] = []
  const descriptions = new Map<string, string>()

  for (const [sheet, css] of sheets) {
    walk(sheet, css, {
      declaration: (d) => declarations.push(d),
      block: (prelude, offset) => blocks.push({ sheet, prelude, offset, css })
    })
    for (const m of css.matchAll(
      /^[ \t]*(--[\w-]+)\s*:[^;]*;[ \t]*\/\*[ \t]*(.*?)[ \t]*\*\/[ \t]*$/gm
    )) {
      if (!descriptions.has(m[1]!)) descriptions.set(m[1]!, m[2]!)
    }
  }

  const publicNames = new Set(
    declarations.filter((d) => !d.utility).map((d) => d.name)
  )
  const internal = [
    ...new Set(
      declarations
        .filter((d) => d.utility && !publicNames.has(d.name))
        .map((d) => d.name)
    )
  ].sort()

  const pick = (list: Declaration[]) =>
    (list.findLast((d) => d.modern) ?? list.at(-1))?.value

  const variables = new Map<string, TokenEntry>()
  const sortKey = new Map<TokenEntry, [rule: number, order: number]>()
  const valueOf = new Map<string, ModeValue>()

  for (const name of publicNames) {
    const own = declarations.filter((d) => d.name === name && !d.utility)
    const real = own.filter((d) => d.value !== `var(${name})`)
    const light = real.filter((d) => !d.dark)
    const dark = real.filter((d) => d.dark)
    const lightValue = pick(light)
    const darkValue = pick(dark)
    const legacy = light.some((d) => d.modern)
      ? light.findLast((d) => !d.modern)?.value
      : undefined
    const fallback = legacy !== lightValue ? legacy : undefined
    valueOf.set(name, { light: lightValue, dark: darkValue })

    const byIntent: Partial<Record<Intent, ModeValue>> = {}
    for (const intent of INTENTS) {
      const scoped = declarations.filter(
        (d) => d.name === name && d.utility === `intent-${intent}`
      )
      const values = {
        light: pick(scoped.filter((d) => !d.dark)),
        dark: pick(scoped.filter((d) => d.dark))
      }
      if (
        scoped.length === 0 ||
        (values.light === lightValue && values.dark === darkValue)
      )
        continue
      byIntent[intent] = compact(values)
    }

    const { family, group, rank } = classify(name, VARIABLE_RULES)
    const entry: TokenEntry = compact({
      name,
      kind: 'variable' as const,
      family,
      group,
      sheet: own[0]!.sheet,
      source: 'roadie' as const,
      value: compact({ light: lightValue, dark: darkValue, fallback }),
      byIntent: Object.keys(byIntent).length > 0 ? byIntent : undefined,
      classes: own.some((d) => d.theme) ? classesFor(name) : undefined,
      description: descriptions.get(name)
    })
    variables.set(name, entry)
    sortKey.set(entry, [rank, declarations.indexOf(real[0] ?? own[0]!)])
  }

  const resolve = (name: string, mode: keyof ModeValue) => {
    let value: string | undefined
    let current: string | undefined = name
    for (let hops = 0; current && hops < 12; hops++) {
      const values = valueOf.get(current)
      const next: string | undefined =
        mode === 'dark' ? (values?.dark ?? values?.light) : values?.light
      if (next === undefined) break
      value = next
      current = next.match(SINGLE_VAR)?.[1]
    }
    return value
  }

  for (const entry of variables.values()) {
    const direct = entry.value
    const light = resolve(entry.name, 'light')
    const dark = resolve(entry.name, 'dark')
    const resolved = compact({
      light: light !== direct?.light ? light : undefined,
      dark: dark !== direct?.dark && dark !== light ? dark : undefined
    })
    if (Object.keys(resolved).length > 0) entry.resolved = resolved
  }

  const tailwind: TokenEntry[] = []
  for (const m of tailwindTheme.matchAll(
    /^\s*(--radius-[\w-]+)\s*:\s*([^;]+);/gm
  )) {
    if (variables.has(m[1]!)) continue
    const entry: TokenEntry = {
      name: m[1]!,
      kind: 'variable',
      family: 'shape',
      group: 'Radius',
      sheet: 'tailwindcss/theme.css',
      source: 'tailwind',
      value: { light: m[2]!.trim() },
      classes: classesFor(m[1]!)
    }
    tailwind.push(entry)
    sortKey.set(entry, [
      classify(m[1]!, VARIABLE_RULES).rank,
      tailwind.length - 1000
    ])
  }

  const rules: TokenEntry[] = []
  const seen = new Set<string>()
  const add = (entry: TokenEntry, rank: number) => {
    const key = `${entry.kind}:${entry.name}`
    if (seen.has(key)) return
    seen.add(key)
    const compacted = compact(entry)
    rules.push(compacted)
    sortKey.set(compacted, [rank, rules.length])
  }

  for (const { sheet, prelude, offset, css } of blocks) {
    const utility = prelude.match(/^@utility ([\w*-]+)$/)?.[1]
    const keyframes = prelude.match(/^@keyframes ([\w-]+)$/)?.[1]
    const plainClass = prelude.match(/^\.([\w-]+)$/)?.[1]
    const name =
      utility ?? keyframes ?? (plainClass !== 'dark' ? plainClass : undefined)
    if (!name) continue
    const kind: TokenKind = utility
      ? 'utility'
      : keyframes
        ? 'keyframes'
        : 'class'
    const { family, group, rank } =
      kind === 'keyframes'
        ? { family: 'motion' as const, group: 'Keyframes', rank: 0 }
        : classify(name, UTILITY_RULES)
    add(
      {
        name,
        kind,
        family,
        group,
        sheet,
        source: 'roadie',
        description: commentBefore(css, offset)
      },
      rank
    )
  }

  for (const [sheet, css] of sheets) {
    const clean = blankComments(css)
    for (const m of clean.matchAll(/@custom-variant ([\w-]+)/g)) {
      add(
        {
          name: m[1]!,
          kind: 'variant',
          family: 'component-utilities',
          group: 'Variants',
          sheet,
          source: 'roadie',
          description: commentBefore(css, m.index)
        },
        0
      )
    }
  }

  const all = [...variables.values(), ...tailwind, ...rules]
  const rank = (family: TokenEntry['family']) => {
    const index = TOKEN_FAMILIES.indexOf(family as TokenFamily)
    return index === -1 ? TOKEN_FAMILIES.length : index
  }

  return {
    generated:
      'By packages/core/scripts/generate-tokens.mjs from src/css. Do not edit.',
    tokens: all.sort((a, b) => {
      const [ruleA, orderA] = sortKey.get(a)!
      const [ruleB, orderB] = sortKey.get(b)!
      return (
        rank(a.family) - rank(b.family) ||
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        ruleA - ruleB ||
        orderA - orderB
      )
    }),
    internal
  }
}

function compact<T extends object>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  ) as T
}
