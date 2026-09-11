import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { separators } from './format'
import type { DateStyle, TimeStyle } from './format'

/**
 * The audit skill is deliberately self-contained, so it can run in a consumer
 * repo with no Roadie checkout. The cost is that it keeps copies of constants
 * that live here: the range separator, the style names, the component names.
 *
 * Those two once drifted in opposite directions in a single branch, leaving the
 * skill telling agents to "fix" correct code back into a violation. These
 * assertions fail the build when they disagree again.
 */
const SKILL = readFileSync(
  fileURLToPath(new URL('../../../../skills/audit/SKILL.md', import.meta.url)),
  'utf-8'
)

describe('audit skill parity', () => {
  it('teaches the range separator this module actually emits', () => {
    expect(separators.range).toBe('to')
    expect(SKILL).toContain(
      `The word \`${separators.range}\` joins the two ends`
    )
    expect(SKILL).toContain('separators.range')
  })

  // The failure that prompted this file: a 'Use' column recommending a dash.
  it('never recommends a dash as the fix for a range', () => {
    const recommendsADash = SKILL.split('\n').filter(
      (line) =>
        /^\|/.test(line) &&
        /format(DateRange|TimeRange)|DateTime to/.test(line) &&
        /→\s*[^|]*[–—](?!\s*\|)/.test(line)
    )
    expect(recommendsADash).toEqual([])
  })

  it('names every style the module exposes', () => {
    const dateStyles: DateStyle[] = ['full', 'long', 'medium', 'short', 'iso']
    const timeStyles: TimeStyle[] = ['long', 'medium', 'short', 'numeric']
    for (const style of [...dateStyles, ...timeStyles]) {
      expect(SKILL).toContain(`\`${style}\``)
    }
  })

  // 24-hour is sanctioned in two named styles. A blanket ban flags correct code.
  it('does not ban 24-hour outright', () => {
    expect(SKILL).not.toContain('24-hour belongs solely')
    expect(SKILL).toContain("`timeStyle: 'numeric'`")
  })

  it('points React call sites at the components, not the formatters', () => {
    expect(SKILL).toContain('In React it is always a component')
    for (const component of [
      'DateTime',
      'Duration',
      'Countdown',
      'CalendarTile'
    ]) {
      expect(SKILL).toContain(component)
    }
  })
})
