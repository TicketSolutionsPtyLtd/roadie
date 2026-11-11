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

describe('generate', () => {
  const source = (slug: string, body: string) => ({
    file: `${slug}.svg`,
    slug,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48">${body}</svg>`
  })
  const FACE = (d: string) =>
    `<path id="Face" fill="#e1d1fb" fill-rule="evenodd" d="${d}"/>`
  const STROKE = (d: string) =>
    `<path id="Stroke" stroke="#1a1f2b" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`

  it('warns, without failing, about a source that strays from the style', () => {
    const tiny = source(
      'tiny',
      FACE('M20 20h8v8h-8z') + STROKE('M20 20h8v8h-8z')
    )
    const { failures, warnings } = generate([tiny])
    expect(failures).toEqual([])
    expect(warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/^tiny\.svg: it paints/)])
    )
  })

  it('leaves the warnings until every source passes the check', () => {
    const broken = source('broken', FACE('M20 20h8v8h-8z'))
    expect(generate([broken]).warnings).toEqual([])
  })
})
