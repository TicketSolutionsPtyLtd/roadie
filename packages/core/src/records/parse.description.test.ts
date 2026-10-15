import { describe, expect, it, vi } from 'vitest'

import type * as Describe from './describe'
import { parseQuery } from './parse'
import { eventFields } from './testFields'

// Marks each chip's detail, so a suggestion shows it came from there.
vi.mock('./describe', async (importOriginal) => {
  const actual = await importOriginal<typeof Describe>()
  return {
    ...actual,
    describeRecordFilter: (
      ...args: Parameters<typeof actual.describeRecordFilter>
    ) => {
      const described = actual.describeRecordFilter(...args)
      return described.detail
        ? { ...described, detail: `Chip: ${described.detail}` }
        : described
    }
  }
})

const parse = (text: string) =>
  parseQuery(text, {
    fields: eventFields,
    // Midday Saturday 3 October 2026 in Sydney.
    now: new Date('2026-10-03T02:00:00Z'),
    timeZone: 'Australia/Sydney'
  })

describe('parseQuery descriptions', () => {
  it.each(['upcoming', 'past', 'this weekend', 'next 7 days', 'tomorrow'])(
    'takes the description of "%s" from its chip',
    (text) => {
      expect(parse(text)[0]!.description).toMatch(/^Chip: /)
    }
  )

  it('gives none where the chip has no detail', () => {
    expect(parse('14 mar')[0]).not.toHaveProperty('description')
  })
})
