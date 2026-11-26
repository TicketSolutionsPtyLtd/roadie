import { isActiveValue } from './NavigatorContext'

/** Where the tap landed: a rail item, a row in More, or a secondary row. */
export type ActivationSurface = 'item' | 'overflow' | 'secondary'

export type ActivationSlot = {
  value: string
  href?: string
}

export type ActivationState = {
  /** The browser opens the link in a new tab or window. */
  elsewhere: boolean
  route?: string
}

/** One effect of a tap, applied in order. */
export type ActivationStep =
  | { kind: 'activate'; value: string }
  | { kind: 'closeMore' }
  | { kind: 'closeMoreOnRoute' }
  | { kind: 'setValue'; value: string }

/** What a tap on a destination does, as plain steps; no render needed to read it. */
export function resolveActivation(
  surface: ActivationSurface,
  { value, href }: ActivationSlot,
  { elsewhere, route }: ActivationState
): ActivationStep[] {
  const activate = { kind: 'activate', value } as const
  const setValue = { kind: 'setValue', value } as const
  if (elsewhere) return [activate]
  const closesNow = href === undefined || isActiveValue(value, route)
  switch (surface) {
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
