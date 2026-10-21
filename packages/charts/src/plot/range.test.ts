import { describe, expect, it } from 'vitest'

import { spokenRange, wallRange } from './range'

const at = (iso: string) => Date.parse(`${iso}Z`)

describe('wallRange', () => {
  it.each([
    {
      name: 'days',
      start: '2026-10-03T00:00',
      end: '2026-10-10T00:00',
      options: { hasTime: false },
      range: { start: '2026-10-03', end: '2026-10-10' }
    },
    {
      name: 'quarter hours in wall time',
      start: '2026-10-03T18:00',
      end: '2026-10-03T21:45',
      options: { hasTime: true },
      range: { start: '2026-10-03T18:00', end: '2026-10-03T21:45' }
    },
    {
      name: 'weeks, ending on the last week’s last day',
      start: '2026-09-28T00:00',
      end: '2026-10-05T00:00',
      options: { hasTime: false, bucketDays: 7 },
      range: { start: '2026-09-28', end: '2026-10-11' }
    }
  ])('reads $name', ({ start, end, options, range }) => {
    expect(wallRange(at(start), at(end), options)).toEqual(range)
  })

  it('orders the ends', () => {
    expect(
      wallRange(at('2026-10-10T00:00'), at('2026-10-03T00:00'), {
        hasTime: false
      })
    ).toEqual({ start: '2026-10-03', end: '2026-10-10' })
  })
})

describe('spokenRange', () => {
  it.each([
    {
      name: 'days in one month',
      start: '2026-10-08T00:00',
      end: '2026-10-10T00:00',
      options: { hasTime: false },
      text: 'Selected 8 to 10 October, 3 days. Enter to apply.'
    },
    {
      name: 'days across months',
      start: '2026-09-28T00:00',
      end: '2026-10-04T00:00',
      options: { hasTime: false },
      text: 'Selected 28 September to 4 October, 7 days. Enter to apply.'
    },
    {
      name: 'weeks',
      start: '2026-09-28T00:00',
      end: '2026-10-05T00:00',
      options: { hasTime: false, bucketDays: 7 },
      text: 'Selected 28 September to 11 October, 2 weeks. Enter to apply.'
    },
    {
      name: 'times in one day',
      start: '2026-10-03T18:00',
      end: '2026-10-03T21:45',
      options: { hasTime: true },
      text: 'Selected Saturday 3 October, 6pm to 9:45pm. Enter to apply.'
    },
    {
      name: 'times across days',
      start: '2026-10-03T22:00',
      end: '2026-10-04T01:00',
      options: { hasTime: true },
      text: 'Selected Saturday 3 October, 10pm to Sunday 4 October, 1am. Enter to apply.'
    }
  ])('reads $name', ({ start, end, options, text }) => {
    expect(spokenRange(at(start), at(end), options)).toBe(text)
  })
})
