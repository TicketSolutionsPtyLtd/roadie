import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { mergeConfig } from '../utils/cn'

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

const safelist = [
  ...readFileSync(join(import.meta.dirname, 'safelist.html'), 'utf8').matchAll(
    /class="([^"]*)"/g
  )
].flatMap(([, classes = '']) => classes.trim().split(/\s+/))

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

const replaceable = new Set(
  Object.values(mergeConfig.extend.classGroups).flatMap((group) =>
    group.flatMap((entry) =>
      typeof entry === 'string'
        ? [entry]
        : Object.entries(entry).flatMap(([prefix, values]) =>
            values.map((value) => `${prefix}-${String(value)}`)
          )
    )
  )
)

const css = sources('packages/core/src/css', /\.css$/).replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)
const chartSteps = new Set(
  [...css.matchAll(/--color-chart-([\w-]+)\s*:/g)].map(([, step]) => step)
)
const roadieUtilities = [
  ...[...css.matchAll(/@utility\s+([\w-]+)\s*\{/g)].map(
    ([, name = '']) => name
  ),
  ...[...chartSteps].flatMap((step) =>
    ['bg', 'text', 'fill', 'stroke'].map((prefix) => `${prefix}-chart-${step}`)
  )
]

describe('safelist.html, what roadie.compiled.css ships', () => {
  it('names only classes a cn() family holds, the docs name, or a package uses', () => {
    expect(
      safelist.filter(
        (name) =>
          !replaceable.has(name) && !documented.has(name) && !used.has(name)
      )
    ).toEqual([])
  })

  it('names every Roadie utility the docs name', () => {
    expect(
      roadieUtilities.filter(
        (name) => documented.has(name) && !safelist.includes(name)
      )
    ).toEqual([])
  })
})
