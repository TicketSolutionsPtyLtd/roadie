import { describe, expect, it } from 'vitest'

import {
  describeValue,
  nounFor,
  plural,
  singular,
  spokenPoint,
  trendSentence
} from './words'

describe('words', () => {
  it('says a value in plain words', () => {
    expect(describeValue(184, 'number', 'orders')).toBe('184 orders')
    expect(describeValue(0.61, 'percent', 'sold')).toBe('61% sold')
    expect(describeValue(null, 'number', 'orders')).toBe('no data')
  })

  it('says a point in plain words', () => {
    expect(spokenPoint(Date.UTC(2026, 2, 10), true, false)).toBe(
      'Tuesday 10 March'
    )
    expect(spokenPoint('Email', false, false)).toBe('Email')
  })

  it('writes a trend sentence with no dashes', () => {
    const sentence = trendSentence({
      noun: 'Tickets sold',
      first: 120,
      last: 1464,
      from: '1 Oct',
      to: '14 Nov'
    })
    expect(sentence).toBe(
      'Tickets sold rose from 120 to 1,464 between 1 Oct and 14 Nov'
    )
    expect(sentence).not.toMatch(/[–—]/)
  })

  it('agrees a noun with its count', () => {
    expect(nounFor(1, 'tickets')).toBe('ticket')
    expect(nounFor(2, 'tickets')).toBe('tickets')
    expect(nounFor(1, 'days')).toBe('day')
    expect(plural('city')).toBe('cities')
    expect(plural('show')).toBe('shows')
    expect(plural('venues')).toBe('venues')
    expect(plural('box')).toBe('boxes')
    expect(singular('suburbs')).toBe('suburb')
    expect(singular('address')).toBe('address')
  })
})
