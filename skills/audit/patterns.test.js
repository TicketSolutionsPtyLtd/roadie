import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const skill = readFileSync(path.join(here, 'SKILL.md'), 'utf8')
const guide = skill.slice(skill.indexOf('## Parallelization guide'))

// The guide's batch lines are what an audit runs, so the test reads them
// rather than keeping its own copy of each pattern.
const patterns = new Map(
  [...guide.matchAll(/^- ([A-Z]\d+): `(.*)`(?: \(.*\))?$/gm)].map(
    ([, id, pattern]) => [id, pattern]
  )
)

function hits(id, fixture) {
  const pattern = patterns.get(id)
  if (!pattern) throw new Error(`no ${id} pattern in the parallelization guide`)
  const source = readFileSync(
    path.join(here, '__testfixtures__', `${fixture}.tsx`),
    'utf8'
  )
  return source.match(new RegExp(pattern, 'g'))?.length ?? 0
}

describe('audit patterns', () => {
  it.each([
    ['I6', 'render-anchor', 2],
    ['I6', 'literal-href', 0],
    ['I2', 'literal-href', 0],
    ['I3', 'literal-href', 0],
    ['C5', 'hand-rolled-icon-tile', 1],
    ['C5', 'icon-tile', 0],
    // A hex colour in a class string is roadie/no-hex-colour-class's, not A3's.
    ['A3', 'colour-sources', 3],
    // A selected state's fill is chosen at runtime, so it isn't a hit.
    ['C4', 'icon-weights', 2],
    // H6 keys on a month stacked over a day, whatever the month's case.
    ['H6', 'hand-rolled-calendar-tile', 1],
    ['H6', 'hand-rolled-calendar-tile-uppercase', 1],
    ['H6', 'calendar-tile', 0]
  ])('%s in %s: %i hit(s)', (id, fixture, count) => {
    expect(hits(id, fixture)).toBe(count)
  })
})
