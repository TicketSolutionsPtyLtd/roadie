import { describe, expect, it } from 'vitest'

import {
  type SearchDraftEvent,
  heldSearch,
  searchDraft,
  startSearchDraft
} from './searchDraft'

const run = (
  events: readonly SearchDraftEvent[],
  from = startSearchDraft('')
) => events.reduce(searchDraft, from)
const shown = (search: string): SearchDraftEvent => ({ type: 'shown', search })
const typed = (search: string): SearchDraftEvent => ({ type: 'typed', search })
const sent = (search: string): SearchDraftEvent => ({ type: 'sent', search })

describe('searchDraft', () => {
  it.each([
    {
      name: 'shows each keystroke before it is sent',
      events: [typed('Per'), typed('Perth')],
      draft: 'Perth',
      held: ''
    },
    {
      name: 'expects the parent to hold the last search sent',
      events: [typed('Perth'), sent('Perth')],
      draft: 'Perth',
      held: 'Perth'
    },
    {
      name: 'keeps the draft when the parent echoes a search it was sent',
      events: [sent('Per'), typed('Perth'), shown('Per')],
      draft: 'Perth',
      held: 'Per'
    },
    {
      name: 'reads each echo in turn while the parent catches up',
      events: [sent('a'), sent('ab'), typed('abc'), shown('a'), shown('ab')],
      draft: 'abc',
      held: 'ab'
    },
    {
      name: 'takes a search set from outside over the draft',
      events: [typed('Perth'), shown('Ocean')],
      draft: 'Ocean',
      held: 'Ocean'
    },
    {
      name: 'reads a late echo of an earlier search as an echo, not a change',
      events: [sent('f'), sent(''), shown('f'), shown('')],
      draft: '',
      held: ''
    },
    {
      name: 'sends a search that goes back to the one the parent holds',
      events: [shown('x'), sent('xy'), sent('x')],
      draft: 'x',
      held: 'x'
    },
    {
      name: 'reads a later outside search as outside after a clear it never echoed',
      events: [sent('f'), sent(''), shown(''), shown('f')],
      draft: 'f',
      held: 'f'
    },
    {
      name: 'reads a later outside search as outside after a backspace it never echoed',
      events: [shown('x'), sent('xy'), sent('x'), shown('x'), shown('xy')],
      draft: 'xy',
      held: 'xy'
    }
  ])('$name', ({ events, draft, held }) => {
    const state = run(events)
    expect(state.draft).toBe(draft)
    expect(heldSearch(state)).toBe(held)
  })

  it('counts each search set from outside, so a pending one is dropped, and never an echo', () => {
    const echoed = run([sent('Per'), shown('Per')])
    expect(echoed.outside).toBe(0)
    expect(run([shown('Ocean')], echoed).outside).toBe(1)
  })

  it.each([shown('Per'), typed('Per'), sent('Per')])(
    'stays the same object for $type of what it already shows and holds',
    (event) => {
      const state = run([sent('Per'), shown('Per')])
      expect(searchDraft(state, event)).toBe(state)
    }
  )

  it('remembers only the last 20 searches sent', () => {
    const many = Array.from({ length: 25 }, (_, index) => sent(`s${index}`))
    // An echo of one forgotten reads as a change from outside.
    expect(run([...many, shown('s4')]).outside).toBe(1)
    expect(run([...many, shown('s5')]).outside).toBe(0)
  })

  it('never remembers a search the parent will already hold, so repeats keep earlier ones', () => {
    const repeats = Array.from({ length: 20 }, () => sent('b'))
    const state = run([sent('a'), ...repeats, shown('a')])
    expect(state.outside).toBe(0)
    expect(state.draft).toBe('b')
    expect(heldSearch(state)).toBe('b')
  })
})
