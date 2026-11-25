/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// A rule in a named layer loses to a consumer's utility class, as Roadie's
// own classes do. An unlayered rule beats every class, so each one says why.
const UNLAYERED: Record<string, Record<string, string>> = {
  'data-table.css': {
    'tr:is([data-linked], [data-group]) {':
      "A linked row's transform and outline must beat is-interactive-within's",
    '> [data-pin]:first-child':
      "A pinned title's overlay must beat is-interactive-within's inset",
    '> [data-pin]:not(:first-child)':
      "A pinned title's overlay must beat is-interactive-within's inset"
  },
  'editor.css': {
    '*': "The email preview must beat the emphasis-* classes it restyles; the editor's other unlayered rules aren't sorted yet"
  },
  'records-pane.css': {
    "[data-slot='pane'][data-measure='full']":
      "Hands a pane's inset to a table's frame over the frame's own zero"
  }
}

// Rules only: these at-rules declare things rather than style elements.
const DECLARES =
  /^@(layer [\w-]+;|import|source|property|keyframes|utility|custom-variant|theme|plugin|font-face)/

const here = import.meta.dirname ?? join(process.cwd(), 'src/css')
const SHEETS = [
  ...readdirSync(here)
    .filter((file) => file.endsWith('.css') && file !== 'components.css')
    .map((file) => join(here, file)),
  join(here, '../../../charts/src/css/charts.css'),
  join(here, '../../../editor/src/css/editor.css')
]

/** Each top-level statement that styles elements outside any `@layer`. */
function unlayered(css: string) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const found: string[] = []
  let start = 0
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (char === ';') start = index + 1
    if (char === '{') {
      let depth = 1
      let end = index + 1
      while (depth > 0 && end < source.length) {
        if (source[end] === '{') depth++
        if (source[end] === '}') depth--
        end++
      }
      const prelude = source.slice(start, index).trim()
      if (!prelude.startsWith('@layer') && !DECLARES.test(prelude))
        found.push(source.slice(start, end).trim())
      start = index = end
      continue
    }
    index++
  }
  return found
}

describe('component sheets sit in a named layer', () => {
  it.each(SHEETS.map((path) => [path.split('/').at(-1)!, path]))(
    '%s layers every rule, or says why not',
    (sheet, path) => {
      const allowed = Object.keys(UNLAYERED[sheet] ?? {})
      const unexplained = unlayered(readFileSync(path, 'utf8')).filter(
        (rule) => !allowed.some((key) => key === '*' || rule.includes(key))
      )
      expect(unexplained.map((rule) => rule.split('{')[0]!.trim())).toEqual([])
    }
  )
})
