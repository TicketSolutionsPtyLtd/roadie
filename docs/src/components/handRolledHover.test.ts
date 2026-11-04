import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..')

// Each file's lines with a hand-rolled state, each with its why beside it.
const ALLOWED = new Map([['components/AppearanceSettings.tsx', 1]])

const STATE = '(?:hover|focus|focus-visible|focus-within|active)'

// A Tailwind state variant, after any other variant or in an arbitrary
// selector, but not a `(hover:hover)` media gate.
const HAND_ROLLED_STATE = new RegExp(
  `(?:^|[\\s'"\`:\\]*])(?:group-|peer-|has-|in-|not-)?${STATE}(?:/[\\w-]+)?:(?=[\\w[(!*-])|\\[(?![^\\]]*@media)[^\\]\\s]*:${STATE}(?![a-z])[^\\]\\s]*\\]`
)

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : []
  })
}

function handRolledLines(path: string) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line, index) => (HAND_ROLLED_STATE.test(line) ? [index + 1] : []))
}

describe('docs hover and focus states', () => {
  it('come from interaction utilities, never state classes', () => {
    const handRolled = sources(SRC).flatMap((path) => {
      const file = relative(SRC, path).split(sep).join('/')
      const lines = handRolledLines(path)
      if (lines.length === ALLOWED.get(file)) return []
      return lines.map((line) => `${file}:${line}`)
    })
    expect(handRolled).toEqual([])
  })

  it('reads every source, and each allowed file still has its exception', () => {
    const files = sources(SRC).map((path) => relative(SRC, path))
    expect(files.length).toBeGreaterThan(100)
    for (const [file, count] of ALLOWED) {
      expect(handRolledLines(join(SRC, file))).toHaveLength(count)
    }
  })

  it.each([
    "className='text-subtle hover:text-normal'",
    "'group-hover:text-accent-11'",
    "'group-hover/item:text-normal'",
    "'sm:hover:underline'",
    "'data-[state=open]:hover:bg-subtle'",
    "'[&:hover]:underline'",
    "'[&:hover_svg]:text-normal'",
    "'[&_a:hover]:underline'",
    "'has-[:focus-visible]:ring-2'",
    "'*:hover:underline'",
    "'focus-visible:ring-2'",
    "'has-focus-visible:ring-2'",
    "'active:scale-95'"
  ])('catches %s', (line) => {
    expect(HAND_ROLLED_STATE.test(line)).toBe(true)
  })

  it.each([
    "'[@media(hover:hover)]:bg-subtle'",
    '@media (hover: hover) {',
    '{ active: true, focus: false }'
  ])('ignores %s', (line) => {
    expect(HAND_ROLLED_STATE.test(line)).toBe(false)
  })
})
