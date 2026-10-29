import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..')

// Each one says why beside the class.
const ALLOWED = new Set(['components/AppearanceSettings.tsx'])

// A Tailwind hover variant, but not a `(hover:hover)` media gate.
const HOVER_CLASS = /(?:^|[\s'"`])(?:[\w-]+:)*(?:group-|peer-)?hover:[\w[]/

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : []
  })
}

describe('docs hover states', () => {
  it('come from interaction utilities, never hover classes', () => {
    const handRolled = sources(SRC).flatMap((path) => {
      const file = relative(SRC, path)
      if (ALLOWED.has(file)) return []
      return readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          HOVER_CLASS.test(line) ? [`${file}:${index + 1}`] : []
        )
    })
    expect(handRolled).toEqual([])
  })

  it('reads every source, and each allowed file still exists', () => {
    const files = sources(SRC).map((path) => relative(SRC, path))
    expect(files.length).toBeGreaterThan(100)
    for (const file of ALLOWED) expect(files).toContain(file)
  })

  it('catches a hover class', () => {
    expect(HOVER_CLASS.test("className='text-subtle hover:text-normal'")).toBe(
      true
    )
    expect(HOVER_CLASS.test("'group-hover:text-accent-11'")).toBe(true)
    expect(HOVER_CLASS.test("'sm:hover:underline'")).toBe(true)
    expect(HOVER_CLASS.test("'[@media(hover:hover)]:bg-subtle'")).toBe(false)
  })
})
