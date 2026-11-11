// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { componentName, generate, nameClashes, stale } from './generate.ts'

describe('the spot illustration sources', () => {
  const { files, failures } = generate()

  it('all pass the check', () => {
    expect(failures).toEqual([])
  })

  it('match their generated components; run `pnpm spot:generate` if not', () => {
    for (const [path, contents] of files)
      expect(readFileSync(path, 'utf8'), path).toBe(contents)
    expect(stale(files)).toEqual([])
  })
})

describe('nameClashes', () => {
  it('passes names that each give their own component', () => {
    expect(nameClashes(['heart', 'map-pin', 'mappin'])).toEqual([])
  })

  it('flags names that give the same component, or one the package already exports', () => {
    expect(nameClashes(['note-1', 'note1', 'spot-illustration'])).toEqual([
      'note-1.svg and note1.svg would both be Note1; rename one',
      'spot-illustration.svg would be SpotIllustration, which the package already exports; rename it'
    ])
  })
})

describe('componentName', () => {
  it.each([
    ['heart', 'Heart'],
    ['arrow-up-right', 'ArrowUpRight'],
    ['number-0-zero', 'Number0Zero']
  ])('names %s %s', (slug, name) => {
    expect(componentName(slug)).toBe(name)
  })
})
