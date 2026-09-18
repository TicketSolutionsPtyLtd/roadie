import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { restoreNavigation, setNavigation } from '../Navigator/testUtils'
import {
  forgetPaneScroll,
  historyEntryKey,
  recallPaneScroll,
  rememberPaneScroll
} from './paneScroll'

let hadNavigation: PropertyDescriptor | undefined
beforeEach(() => {
  hadNavigation = Object.getOwnPropertyDescriptor(window, 'navigation')
})
afterEach(() => {
  forgetPaneScroll()
  restoreNavigation(hadNavigation)
})

describe('historyEntryKey', () => {
  it('is the browser own id for the entry', () => {
    setNavigation({ currentEntry: { key: 'abc' } })
    expect(historyEntryKey()).toBe('abc')
  })

  it('is null where the engine has no Navigation API, and panes then stay at the top', () => {
    expect(historyEntryKey()).toBeNull()
  })

  it('is null for an entry the browser gives no key', () => {
    setNavigation({ currentEntry: null })
    expect(historyEntryKey()).toBeNull()
  })
})

describe('what a pane remembers', () => {
  it('gives back what that seat was scrolled to on that entry', () => {
    rememberPaneScroll('e1', '0:detail:auto', 240)
    rememberPaneScroll('e1', '0:list:0', 80)
    expect(recallPaneScroll('e1', '0:detail:auto')).toBe(240)
    expect(recallPaneScroll('e1', '0:list:0')).toBe(80)
  })

  it('knows nothing of an entry never scrolled on, so a forward arrival is the top', () => {
    rememberPaneScroll('e1', '0:detail:auto', 240)
    expect(recallPaneScroll('e2', '0:detail:auto')).toBeUndefined()
    expect(recallPaneScroll('e1', '0:inspector:auto')).toBeUndefined()
  })

  it('keeps a session of going back, dropping the least recently written first', () => {
    for (let at = 0; at < 30; at += 1) {
      rememberPaneScroll(`e${at}`, 'seat', at)
    }
    rememberPaneScroll('e0', 'seat', 999)
    rememberPaneScroll('e30', 'seat', 30)
    expect(recallPaneScroll('e0', 'seat')).toBe(999)
    expect(recallPaneScroll('e30', 'seat')).toBe(30)
    expect(recallPaneScroll('e1', 'seat')).toBeUndefined()
    expect(recallPaneScroll('e2', 'seat')).toBe(2)
  })
})
