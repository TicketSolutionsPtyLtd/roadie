import { describe, expect, it } from 'vitest'

import { type ActivationSurface, resolveActivation } from './activation'

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

  it.each<ActivationSurface>(['item', 'overflow', 'secondary'])(
    '%s only activates a link the browser opens in a new tab',
    (surface) => {
      expect(
        resolveActivation(surface, events, { elsewhere: true, route: '/home' })
      ).toEqual([{ kind: 'activate', value: '/events' }])
    }
  )
})
