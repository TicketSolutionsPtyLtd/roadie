import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { cn, mergeConfig } from './cn'

const cssFolder = new URL('../css/', import.meta.url)
const css = readdirSync(cssFolder)
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(new URL(file, cssFolder), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')

const safelist = [
  ...readFileSync(new URL('safelist.html', cssFolder), 'utf8').matchAll(
    /class="([^"]*)"/g
  )
].flatMap(([, names = '']) => names.trim().split(/\s+/))

const utilities = (name: RegExp) =>
  [...css.matchAll(/@utility\s+([\w-]+)\s*\{/g)]
    .map(([, utility = '']) => utility)
    .filter((utility) => name.test(utility))

const themed = (namespace: string, prefix: string) =>
  [...css.matchAll(new RegExp(`--${namespace}-([\\w-]+)\\s*:`, 'g'))].map(
    ([, step]) => `${prefix}-${step}`
  )

const families = [
  {
    group: 'duration',
    members: themed('transition-duration', 'duration'),
    safelisted: /^duration-/
  },
  { group: 'ease', members: themed('ease', 'ease'), safelisted: /^ease-/ },
  {
    group: 'animate',
    members: utilities(/^animate-/),
    safelisted: /^animate-/
  },
  { group: 'z', members: themed('z-index', 'z'), safelisted: /^z-/ },
  {
    group: 'font-size',
    members: utilities(/^text-/),
    safelisted: /^text-(display|ui|prose|code)\b/
  },
  {
    group: 'semantic-text-color',
    members: themed('text-color', 'text'),
    safelisted: /^text-(?!display|ui|prose|code|chart)/
  },
  {
    group: 'semantic-bg-color',
    members: [...themed('background-color', 'bg'), ...utilities(/^surface-/)],
    safelisted: /^(bg-(?!chart)|surface-)/
  },
  {
    group: 'semantic-border-color',
    members: themed('border-color', 'border'),
    safelisted: /^border-/
  },
  {
    group: 'intent',
    members: utilities(/^intent-/),
    safelisted: /^intent-/
  },
  {
    group: 'emphasis',
    members: utilities(/^emphasis-/),
    safelisted: /^emphasis-/
  },
  {
    group: 'selection',
    members: utilities(/^is-(un)?selected/),
    safelisted: /^is-(un)?selected/
  },
  { group: 'link', members: utilities(/^link-/), safelisted: /^link-/ },
  {
    group: 'prose-size',
    members: utilities(/^prose-/),
    safelisted: /^prose-/
  }
]

const { classGroups } = mergeConfig.extend
const grouped = (group: string) =>
  (classGroups[group as keyof typeof classGroups] ?? []).flatMap((entry) =>
    typeof entry === 'string'
      ? [entry]
      : Object.entries(entry).flatMap(([prefix, values]) =>
          values.map((value) => `${prefix}-${String(value)}`)
        )
  )

describe('class families where one class replaces another', () => {
  it('has a row for every cn() group', () => {
    expect(families.map(({ group }) => group).sort()).toEqual(
      Object.keys(classGroups).sort()
    )
  })

  describe.each(families)('$group', ({ group, members, safelisted }) => {
    it('is defined in core’s CSS', () => {
      expect(members.length).toBeGreaterThan(1)
    })

    it('lets every member replace every other through cn()', () => {
      for (const earlier of members)
        for (const later of members)
          expect(cn(earlier, later), `${earlier} then ${later}`).toBe(later)
    })

    it('names in cn() exactly the members core’s CSS defines', () => {
      expect(new Set(grouped(group))).toEqual(new Set(members))
    })

    it('safelists exactly the members core’s CSS defines', () => {
      expect(new Set(safelist.filter((name) => safelisted.test(name)))).toEqual(
        new Set(members)
      )
    })
  })
})
