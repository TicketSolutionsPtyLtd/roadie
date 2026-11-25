/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// A rule in one of Tailwind's layers loses to a consumer's utility class, as
// Roadie's own classes do. An unlayered rule beats every class, so each one
// says why. Keys match the start of a rule's selector or at-rule.
const UNLAYERED: Record<string, Record<string, string>> = {
  'charts.css': {
    '@media (scripting: none)':
      "Shows the server drawing over ChartPlot's opacity-0 class"
  },
  'data-table.css': {
    "[data-slot='data-table'] tr:is([data-linked], [data-group])":
      "A linked row's press and a pinned title's overlay must beat is-interactive-within's"
  },
  'editor.css': {
    '[data-email]':
      'The email preview must beat the emphasis-* classes it restyles',
    "[data-preset='email']": 'The email preview (INNO-1737)',
    '@container email-frame': 'The email preview (INNO-1737)',
    "[data-slot='editor": 'Not yet checked in a layer (INNO-1737)',
    '@media (forced-colors': 'Not yet checked in a layer (INNO-1737)',
    '@media (hover: hover)': 'Not yet checked in a layer (INNO-1737)'
  },
  'records-pane.css': {
    ':is(': "Hands a pane's inset to a table's frame over the frame's own zero"
  }
}

// These at-rules declare things rather than style elements.
const DECLARES =
  /^@(property|keyframes|utility|custom-variant|theme|font-face)\b/
const LAYER = /^@layer (base|components|utilities)$/

const here = import.meta.dirname ?? join(process.cwd(), 'src/css')
const SHEETS = [
  ...readdirSync(here)
    .filter((file) => file.endsWith('.css') && file !== 'components.css')
    .map((file) => join(here, file)),
  join(here, '../../../charts/src/css/charts.css'),
  join(here, '../../../editor/src/css/editor.css')
]

/** Each top-level rule outside Tailwind's layers, and each import without one. */
function unlayered(css: string) {
  const source = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Braces and semicolons inside a string aren't the sheet's structure.
    .replace(/(['"])(?:\\.|(?!\1).)*\1/g, (string) =>
      string.replace(/[{};]/g, ' ')
    )
  const found: string[] = []
  let start = 0
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (char === ';') {
      const statement = source.slice(start, index).trim()
      if (statement.startsWith('@import') && !/\blayer\(/.test(statement))
        found.push(statement)
      start = index + 1
    }
    if (char === '{') {
      let depth = 1
      let end = index + 1
      while (depth > 0 && end < source.length) {
        if (source[end] === '{') depth++
        if (source[end] === '}') depth--
        end++
      }
      const prelude = source.slice(start, index).trim().replace(/\s+/g, ' ')
      if (!LAYER.test(prelude) && !DECLARES.test(prelude)) found.push(prelude)
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
        (prelude) => !allowed.some((key) => prelude.startsWith(key))
      )
      expect(unexplained).toEqual([])
    }
  )
})
