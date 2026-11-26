import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { classGroups } from '../utils/classGroups.generated'

const repo = resolve(import.meta.dirname, '../../../..')

const sources = (folder: string, files: RegExp) =>
  readdirSync(join(repo, folder), { recursive: true, encoding: 'utf8' })
    .filter(
      (file) => files.test(file) && !/\.test\.|_test|testUtils/.test(file)
    )
    .map((file) => readFileSync(join(repo, folder, file), 'utf8'))
    .join('\n')

// A class counts as named wherever it stands as a whole word: in an example,
// a className, or prose.
const names = (text: string) => new Set(text.split(/[^\w-]+/))

const classesIn = (file: string) =>
  [
    ...readFileSync(join(import.meta.dirname, file), 'utf8').matchAll(
      /class="([^"]*)"/g
    )
  ].flatMap(([, classes = '']) => classes.trim().split(/\s+/))

const safelist = classesIn('safelist.html')
const shipped = [...safelist, ...classesIn('safelist.families.html')]

const documented = names(sources('docs/src', /\.(mdx|tsx)$/))

// Core defines the utilities; the packages built on it are where they're used.
// Only folders with a `src` count, so a `.DS_Store` or a package folder another
// branch left behind doesn't throw.
const used = names(
  readdirSync(join(repo, 'packages'))
    .filter(
      (name) =>
        !['core', 'lint-plugin'].includes(name) &&
        existsSync(join(repo, 'packages', name, 'src'))
    )
    .map((name) => sources(`packages/${name}/src`, /\.(tsx?|vue|css)$/))
    .join('\n')
)

const familyMembers = new Set(Object.values(classGroups).flat())

const css = sources('packages/core/src/css', /\.css$/).replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)
const themeKeys = (namespace: string) =>
  new Set(
    [...css.matchAll(new RegExp(`--${namespace}-([\\w-]+)\\s*:`, 'g'))].map(
      ([, key = '']) => key
    )
  )
// Colour utilities as the token manifest names them (src/tokens/manifest.ts).
const colourUtilities = [
  ...[...themeKeys('color')].flatMap((key) =>
    ['bg', 'text', 'border', 'fill', 'stroke'].map(
      (prefix) => `${prefix}-${key}`
    )
  ),
  ...[...themeKeys('border-color')].map((key) => `divide-${key}`)
]
const roadieUtilities = [
  ...[...css.matchAll(/@utility\s+([\w-]+)\s*\{/g)].map(
    ([, name = '']) => name
  ),
  ...colourUtilities
]

describe('safelist.html, what roadie.compiled.css ships beyond the families', () => {
  it('names only classes the docs name or a package uses', () => {
    expect(
      safelist.filter((name) => !documented.has(name) && !used.has(name))
    ).toEqual([])
  })

  it('leaves the cn() family members to safelist.families.html', () => {
    expect(safelist.filter((name) => familyMembers.has(name))).toEqual([])
  })

  it('names every Roadie utility and colour utility the docs name', () => {
    expect(
      roadieUtilities.filter(
        (name) => documented.has(name) && !shipped.includes(name)
      )
    ).toEqual([])
  })
})
