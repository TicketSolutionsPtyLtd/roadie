import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

import { type TokenEntry, parseTokenManifest, sheetOrder } from './manifest'

const cssDir = new URL('../css/', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, cssDir), 'utf8')
const sheets = sheetOrder(read('roadie.css')).map(
  (file) => [file, read(file)] as [string, string]
)
const tailwindTheme = readFileSync(
  createRequire(import.meta.url).resolve('tailwindcss/theme.css'),
  'utf8'
)
const manifest = parseTokenManifest(sheets, tailwindTheme)

const find = (name: string, kind: TokenEntry['kind'] = 'variable') => {
  const entry = manifest.tokens.find((t) => t.name === name && t.kind === kind)
  if (!entry) throw new Error(`${kind} ${name} is not in the manifest`)
  return entry
}

const INTERNAL = [
  '--field-border-color',
  '--field-focus-bg',
  '--field-hover-bg',
  '--translucent-backdrop',
  '--translucent-fill',
  '--tw-inset-shadow',
  '--tw-shadow'
]

describe('coverage', () => {
  const source = sheets
    .map(([, css]) => css.replace(/\/\*[\s\S]*?\*\//g, ''))
    .join('\n')
  const names = (pattern: RegExp) =>
    new Set([...source.matchAll(pattern)].map((m) => m[1]!))
  const listed = (kind: TokenEntry['kind']) =>
    manifest.tokens
      .filter((t) => t.kind === kind && t.source === 'roadie')
      .map((t) => t.name)

  it('lists nothing twice', () => {
    const keys = manifest.tokens.map((t) => `${t.kind}:${t.name}`)
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([])
  })

  it('lists every custom property, and only the known knobs as internal', () => {
    const declared = names(/(--[\w-]+[\w])\s*:/g)
    const variables = listed('variable')
    expect(manifest.internal).toEqual(INTERNAL)
    expect([...variables, ...manifest.internal].sort()).toEqual(
      [...declared].sort()
    )
  })

  it.each([
    ['utility', /@utility\s+([\w*-]+)/g],
    ['keyframes', /@keyframes\s+([\w-]+)/g],
    ['variant', /@custom-variant\s+([\w-]+)/g]
  ] as const)('lists every %s once', (kind, pattern) => {
    expect(listed(kind).sort()).toEqual([...names(pattern)].sort())
  })

  it('classifies every entry into a family', () => {
    expect(manifest.tokens.filter((t) => t.family === 'unclassified')).toEqual(
      []
    )
  })

  it('names every utility in the safelist, or the compiled sheet drops it', () => {
    const safelisted = new Set(
      read('safelist.html')
        .match(/class="[^"]*"/g)!
        .flatMap((attr) => attr.slice(7, -1).split(/\s+/))
    )
    const missing = listed('utility').filter(
      (name) => !name.endsWith('*') && !safelisted.has(name)
    )
    expect(missing).toEqual([])
  })
})

describe('values', () => {
  it('resolves an intent role through the scale in each mode', () => {
    const bg = find('--intent-bg-normal')
    expect(bg.value).toEqual({
      light: 'var(--color-neutral-1)',
      dark: 'var(--color-neutral-2)'
    })
    expect(bg.byIntent?.danger).toEqual({
      light: 'var(--color-danger-1)',
      dark: 'var(--color-danger-2)'
    })
    expect(find('--intent-bg-subtle').resolved?.light).toBe(
      'color-mix(in oklch, var(--color-neutral-9) 11%, transparent)'
    )
  })

  it('prefers the oklch value and keeps the hex fallback', () => {
    expect(find('--color-danger-9').value).toEqual({
      light: 'oklch(0.709 0.184 28.37)',
      dark: 'oklch(0.709 0.184 28.37)',
      fallback: '#ff6b5c'
    })
  })

  it('derives the classes a theme namespace generates', () => {
    expect(find('--z-index-popover').classes).toEqual(['z-popover'])
    expect(find('--radius-5xl').classes).toEqual(['rounded-5xl'])
    expect(find('--background-color-mark').classes).toEqual(['bg-mark'])
    expect(find('--transition-duration-slow').classes).toEqual([
      'duration-slow'
    ])
  })

  it('gives no classes to a scale Tailwind never registered', () => {
    expect(find('--color-brand-secondary-5').classes).toBeUndefined()
  })

  it("marks Tailwind's radius steps as inherited", () => {
    expect(find('--radius-sm')).toMatchObject({
      source: 'tailwind',
      value: { light: '0.25rem' },
      classes: ['rounded-sm']
    })
  })

  it('carries the comment written beside a token', () => {
    expect(find('--z-index-toast').description).toBe('transient notifications')
  })
})
