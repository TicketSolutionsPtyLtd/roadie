// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { componentName, generate, stale } from './generate.ts'

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

describe('componentName', () => {
  it.each([
    ['heart', 'Heart'],
    ['arrow-up-right', 'ArrowUpRight'],
    ['number-0-zero', 'Number0Zero']
  ])('names %s %s', (slug, name) => {
    expect(componentName(slug)).toBe(name)
  })
})
