import { describe, expect, it } from 'vitest'

import { nextAnnouncement } from './labels'

describe('nextAnnouncement', () => {
  it('changes the text of a repeat, so a screen reader reads it again', () => {
    const first = nextAnnouncement('', 'Selection cleared')
    const second = nextAnnouncement(first, 'Selection cleared')
    const third = nextAnnouncement(second, 'Selection cleared')
    expect(first).toBe('Selection cleared')
    expect(second).not.toBe(first)
    expect(second.trim()).toBe('Selection cleared')
    expect(third).not.toBe(second)
  })

  it('passes a new message through', () => {
    expect(nextAnnouncement('Selection cleared', 'March 2027')).toBe(
      'March 2027'
    )
  })
})
