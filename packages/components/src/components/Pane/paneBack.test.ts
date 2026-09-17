import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  restoreNavigation,
  setNavigation as setWindowNavigation
} from '../Navigator/testUtils'
import { traverseToBackHref } from './paneBack'

type BackClick = Parameters<typeof traverseToBackHref>[0]
type Entry = {
  index: number
  sameDocument: boolean
  url: string | null
}

const entry = (index: number, href: string, sameDocument = true): Entry => ({
  index,
  sameDocument,
  url: new URL(href, window.location.href).href
})

const setNavigation = (value: Record<string, unknown> | undefined) => {
  const back = value?.back
  if (typeof back === 'function') {
    vi.spyOn(window.history, 'back').mockImplementation(() => back())
  }
  setWindowNavigation(
    value === undefined
      ? undefined
      : {
          activation: {
            entry: { key: 'initial' },
            navigationType: 'push'
          },
          ...value
        }
  )
}

const click = (overrides: Partial<BackClick> = {}) => {
  const preventDefault = vi.fn()
  const currentTarget = document.createElement('a')
  currentTarget.href = '/tickets'
  const event: BackClick = {
    altKey: false,
    button: 0,
    ctrlKey: false,
    currentTarget,
    defaultPrevented: false,
    metaKey: false,
    preventDefault,
    shiftKey: false,
    ...overrides
  }
  return { event, preventDefault }
}

describe('traverseToBackHref', () => {
  let navigationProperty: PropertyDescriptor | undefined

  beforeEach(() => {
    navigationProperty = Object.getOwnPropertyDescriptor(window, 'navigation')
  })

  afterEach(() => {
    restoreNavigation(navigationProperty)
    vi.restoreAllMocks()
  })

  it('traverses when the previous same-document entry matches the route and query', () => {
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/tickets/123?org=oztix'),
      entries: () => [
        entry(0, '/tickets?org=oztix#saved-position'),
        entry(1, '/tickets/123?org=oztix')
      ],
      back
    })
    const { event, preventDefault } = click()
    event.currentTarget.setAttribute('href', '/tickets?org=oztix')

    expect(traverseToBackHref(event)).toBe(true)
    expect(back).toHaveBeenCalledOnce()
    expect(preventDefault).toHaveBeenCalledOnce()
  })

  it('leaves a different pathname to the real href', () => {
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/tickets/123'),
      entries: () => [entry(0, '/account'), entry(1, '/tickets/123')],
      back
    })
    const { event, preventDefault } = click()

    expect(traverseToBackHref(event)).toBe(false)
    expect(back).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('matches the href rendered by the routing provider', () => {
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/roadie/tickets/123'),
      entries: () => [
        entry(0, '/roadie/tickets'),
        entry(1, '/roadie/tickets/123')
      ],
      back
    })
    const { event, preventDefault } = click()
    event.currentTarget.setAttribute('href', '/roadie/tickets')

    expect(traverseToBackHref(event)).toBe(true)
    expect(back).toHaveBeenCalledOnce()
    expect(preventDefault).toHaveBeenCalledOnce()
  })

  it('treats search parameters as part of the destination', () => {
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/tickets/123?org=studio'),
      entries: () => [
        entry(0, '/tickets?org=personal'),
        entry(1, '/tickets/123?org=studio')
      ],
      back
    })
    const { event, preventDefault } = click()

    expect(traverseToBackHref(event)).toBe(false)
    expect(back).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('does not traverse immediately after a reload', () => {
    const back = vi.fn()
    setNavigation({
      activation: {
        entry: { key: 'detail' },
        navigationType: 'reload'
      },
      currentEntry: { ...entry(1, '/tickets/123'), key: 'detail' },
      entries: () => [entry(0, '/tickets'), entry(1, '/tickets/123')],
      back
    })
    const { event, preventDefault } = click()

    expect(traverseToBackHref(event)).toBe(false)
    expect(back).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('does not traverse to an entry from another document', () => {
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/tickets/123'),
      entries: () => [entry(0, '/tickets', false), entry(1, '/tickets/123')],
      back
    })
    const { event, preventDefault } = click()

    expect(traverseToBackHref(event)).toBe(false)
    expect(back).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('falls back when the Navigation API cannot prove a safe traversal', () => {
    const unavailableClick = click()
    setNavigation(undefined)
    expect(traverseToBackHref(unavailableClick.event)).toBe(false)
    expect(unavailableClick.preventDefault).not.toHaveBeenCalled()

    const partialClick = click()
    setWindowNavigation({
      currentEntry: entry(1, '/tickets/123'),
      entries: () => [entry(0, '/tickets'), entry(1, '/tickets/123')]
    })
    expect(traverseToBackHref(partialClick.event)).toBe(false)
    expect(partialClick.preventDefault).not.toHaveBeenCalled()

    const back = vi.fn()
    setNavigation({
      currentEntry: entry(0, '/tickets/123'),
      entries: () => [entry(0, '/tickets/123')],
      back
    })
    const firstEntryClick = click()
    expect(traverseToBackHref(firstEntryClick.event)).toBe(false)
    expect(back).not.toHaveBeenCalled()
    expect(firstEntryClick.preventDefault).not.toHaveBeenCalled()
  })

  it.each([
    ['middle', { button: 1 }],
    ['meta', { metaKey: true }],
    ['control', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    [
      'new-tab',
      {
        currentTarget: Object.assign(document.createElement('a'), {
          target: '_blank'
        })
      }
    ],
    ['cancelled', { defaultPrevented: true }]
  ] satisfies [string, Partial<BackClick>][])(
    '%s clicks keep normal anchor behavior',
    (_, overrides) => {
      const back = vi.fn()
      setNavigation({
        currentEntry: entry(1, '/tickets/123'),
        entries: () => [entry(0, '/tickets'), entry(1, '/tickets/123')],
        back
      })
      const { event, preventDefault } = click(overrides)

      expect(traverseToBackHref(event)).toBe(false)
      expect(back).not.toHaveBeenCalled()
      expect(preventDefault).not.toHaveBeenCalled()
    }
  )

  it('honours inherited and explicitly empty targets', () => {
    const base = document.createElement('base')
    base.target = '_blank'
    document.head.append(base)
    const back = vi.fn()
    setNavigation({
      currentEntry: entry(1, '/tickets/123'),
      entries: () => [entry(0, '/tickets'), entry(1, '/tickets/123')],
      back
    })
    const { event, preventDefault } = click()

    try {
      expect(traverseToBackHref(event)).toBe(false)
      expect(back).not.toHaveBeenCalled()
      expect(preventDefault).not.toHaveBeenCalled()

      const explicit = click()
      explicit.event.currentTarget.setAttribute('target', '')
      expect(traverseToBackHref(explicit.event)).toBe(true)
      expect(back).toHaveBeenCalledOnce()
      expect(explicit.preventDefault).toHaveBeenCalledOnce()
    } finally {
      base.remove()
    }
  })

  it('keeps the href fallback when traversal cannot start', () => {
    const back = vi.fn(() => {
      throw new Error('navigation unavailable')
    })
    setNavigation({
      currentEntry: entry(1, '/tickets/123'),
      entries: () => [entry(0, '/tickets'), entry(1, '/tickets/123')],
      back
    })
    const { event, preventDefault } = click()

    expect(traverseToBackHref(event)).toBe(false)
    expect(preventDefault).not.toHaveBeenCalled()
  })
})
