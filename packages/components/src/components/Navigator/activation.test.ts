import { describe, expect, it } from 'vitest'

import {
  type ActivationSlot,
  type ActivationState,
  type ActivationSurface,
  resolveActivation
} from './activation'

const events = { value: '/events', href: '/events' }

describe('resolveActivation', () => {
  it.each<{
    surface: ActivationSurface
    name: string
    slot: { value: string; href?: string }
    route?: string
    want: string[]
  }>([
    {
      surface: 'item',
      name: 'navigates, leaving More to the route',
      slot: events,
      want: ['closeMoreOnRoute', 'setValue /events', 'activate /events']
    },
    {
      surface: 'item',
      name: 'closes More at once on its own route',
      slot: events,
      route: '/events',
      want: ['closeMore', 'setValue /events', 'activate /events']
    },
    {
      surface: 'item',
      name: 'closes More at once with no route to wait for',
      slot: { value: 'events' },
      want: ['closeMore', 'setValue events', 'activate events']
    },
    {
      surface: 'overflow',
      name: 'navigates, leaving More to the route',
      slot: events,
      want: ['activate /events', 'setValue /events']
    },
    {
      surface: 'overflow',
      name: 'closes More at once on its own route',
      slot: events,
      route: '/events',
      want: ['activate /events', 'closeMore', 'setValue /events']
    },
    {
      surface: 'overflow',
      name: 'closes More at once with no route to wait for',
      slot: { value: 'events' },
      want: ['activate events', 'closeMore', 'setValue events']
    },
    {
      surface: 'secondary',
      name: 'navigates',
      slot: events,
      want: ['setValue /events', 'activate /events']
    }
  ])('$surface $name', ({ surface, slot, route, want }) => {
    const steps = resolveActivation(surface, slot, {
      elsewhere: false,
      route: route ?? '/home'
    })
    expect(
      steps.map((step) =>
        'value' in step ? `${step.kind} ${step.value}` : step.kind
      )
    ).toEqual(want)
  })

  it.each<ActivationSurface>(['tab', 'item', 'overflow', 'secondary'])(
    '%s only activates a link the browser opens in a new tab',
    (surface) => {
      expect(
        resolveActivation(surface, events, { elsewhere: true, route: '/home' })
      ).toEqual([{ kind: 'activate', value: '/events' }])
    }
  )
})

describe('resolveActivation on a bar tab', () => {
  const tab = { ...events, topValue: '/events' }
  const active = { ...tab, active: true }
  const owns = { value: '/events' }
  const opening = ['activate /events', 'closeMenu']
  const stay = [...opening, 'preventDefault', 'closeMore']

  it.each<{
    name: string
    slot: ActivationSlot
    state?: Partial<ActivationState>
    want: string[]
  }>([
    {
      name: 'opens the palette, even for a modified click',
      slot: { ...tab, palette: true },
      state: { elsewhere: true },
      want: ['openPalette']
    },
    {
      name: 'navigates to another destination, leaving More to the route',
      slot: tab,
      want: [...opening, 'closeMoreOnRoute', 'setValue /events']
    },
    {
      name: 'closes More at once for a routeless destination',
      slot: { value: 'events', topValue: 'events' },
      want: ['activate events', 'closeMenu', 'closeMore', 'setValue events']
    },
    {
      name: 'scrolls to the top on its own list route',
      slot: active,
      state: { route: '/events', secondary: owns },
      want: [...stay, 'scrollToTop']
    },
    {
      name: 'expands a collapsed bar and scrolls on its own list route',
      slot: active,
      state: { route: '/events', secondary: owns, collapsed: true },
      want: [...stay, 'expandBar', 'scrollToTop']
    },
    {
      name: 'expands a collapsed bar from deeper in',
      slot: active,
      state: { route: '/events/1', secondary: owns, collapsed: true },
      want: [...stay, 'expandBar']
    },
    {
      name: 'toggles the list when the app handles it',
      slot: active,
      state: { route: '/events/1', secondary: owns, showList: false },
      want: [...stay, 'showList true']
    },
    {
      name: 'follows the link back to an overview',
      slot: active,
      state: {
        route: '/events/1',
        secondary: { ...owns, overview: true },
        showList: false
      },
      want: [...opening, 'closeMoreOnRoute', 'setValue /events']
    },
    {
      name: 'scrolls to the top on its top route',
      slot: { ...active, topValue: '/events/all' },
      state: { route: '/events/all' },
      want: [...stay, 'scrollToTop']
    },
    {
      name: 'sets the top route for a routeless tab deeper in',
      slot: { value: 'events', topValue: 'events/all', active: true },
      state: { route: 'events/1' },
      want: [
        'activate events',
        'closeMenu',
        'preventDefault',
        'closeMore',
        'setValue events/all'
      ]
    },
    {
      name: 'follows its link back up from deeper in',
      slot: active,
      state: { route: '/events/1' },
      want: [...opening, 'closeMoreOnRoute']
    }
  ])('$name', ({ slot, state, want }) => {
    const steps = resolveActivation('tab', slot, {
      elsewhere: false,
      route: '/home',
      ...state
    })
    expect(
      steps.map((step) =>
        'value' in step
          ? `${step.kind} ${step.value}`
          : 'show' in step
            ? `${step.kind} ${step.show}`
            : step.kind
      )
    ).toEqual(want)
  })
})
