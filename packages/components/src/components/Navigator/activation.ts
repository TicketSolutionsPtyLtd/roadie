import { isActiveValue } from './NavigatorContext'

/** Where the tap landed: a bar tab, a rail item, a row in More, or a secondary row. */
export type ActivationSurface = 'tab' | 'item' | 'overflow' | 'secondary'

export type ActivationSlot = {
  value: string
  href?: string
  /** A tab's own route, under its destination's value. */
  topValue?: string
  /** The route lights this tab, on its value or below it. */
  active?: boolean
  /** The tab opens the command palette. */
  palette?: boolean
}

export type ActivationState = {
  /** The browser opens the link in a new tab or window. */
  elsewhere: boolean
  route?: string
  collapsed?: boolean
  secondary?: { value: string; overview?: boolean } | null
  /** The list's shown state, only when the app handles `onShowListChange`. */
  showList?: boolean
}

/** One effect of a tap, applied in order. */
export type ActivationStep =
  | { kind: 'openPalette' }
  | { kind: 'activate'; value: string }
  | { kind: 'closeMenu' }
  | { kind: 'preventDefault' }
  | { kind: 'closeMore' }
  | { kind: 'closeMoreOnRoute' }
  | { kind: 'setValue'; value: string }
  | { kind: 'expandBar' }
  | { kind: 'scrollToTop' }
  | { kind: 'showList'; show: boolean }

const STAY: ActivationStep[] = [
  { kind: 'preventDefault' },
  { kind: 'closeMore' }
]

function resolveTab(
  { value, href, topValue = value, active = false }: ActivationSlot,
  { route, collapsed = false, secondary = null, showList }: ActivationState
): ActivationStep[] {
  // A tap that stays on this route closes More now; one that navigates leaves it to the route.
  const go: ActivationStep = {
    kind: href === undefined ? 'closeMore' : 'closeMoreOnRoute'
  }
  if (!active) return [go, { kind: 'setValue', value }]
  const ownsSecondary = secondary?.value === value
  const hasOverview = ownsSecondary && secondary?.overview === true
  if (ownsSecondary && isActiveValue(value, route)) {
    const expand: ActivationStep[] = collapsed ? [{ kind: 'expandBar' }] : []
    return [...STAY, ...expand, { kind: 'scrollToTop' }]
  }
  if (collapsed) return [...STAY, { kind: 'expandBar' }]
  if (ownsSecondary && !hasOverview && showList !== undefined) {
    return [...STAY, { kind: 'showList', show: !showList }]
  }
  if (hasOverview) return [go, { kind: 'setValue', value }]
  if (isActiveValue(topValue, route)) return [...STAY, { kind: 'scrollToTop' }]
  if (href === undefined) {
    return [...STAY, { kind: 'setValue', value: topValue }]
  }
  return [go]
}

/** What a tap on a destination does, as plain steps; no render needed to read it. */
export function resolveActivation(
  surface: ActivationSurface,
  slot: ActivationSlot,
  state: ActivationState
): ActivationStep[] {
  const { value, href } = slot
  const { elsewhere, route } = state
  const activate = { kind: 'activate', value } as const
  const setValue = { kind: 'setValue', value } as const
  if (surface === 'tab' && slot.palette) return [{ kind: 'openPalette' }]
  if (elsewhere) return [activate]
  const closesNow = href === undefined || isActiveValue(value, route)
  switch (surface) {
    case 'tab':
      return [activate, { kind: 'closeMenu' }, ...resolveTab(slot, state)]
    case 'item':
      return [
        { kind: closesNow ? 'closeMore' : 'closeMoreOnRoute' },
        setValue,
        activate
      ]
    case 'overflow':
      // A routed row leaves More to the route, so the old page never shows between.
      return closesNow
        ? [activate, { kind: 'closeMore' }, setValue]
        : [activate, setValue]
    case 'secondary':
      return [setValue, activate]
  }
}
