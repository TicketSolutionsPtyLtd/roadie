import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'

export type MapPinLook = {
  /**
   * Colours the pin. Without it, the pin follows the surrounding intent.
   * Doesn't apply with `pin`.
   */
  intent?: RoadieIntent
  /**
   * An icon in the pin, such as a venue's type. A dot by default. Doesn't
   * apply with `pin`.
   */
  icon?: ReactNode
  /**
   * A graphic in place of Roadie's pin, such as a spot illustration, sized
   * with its own `className`. Its bottom centre sits on the place. `null` or
   * `false` keeps Roadie's pin.
   */
  pin?: ReactNode
}

/**
 * Whether `pin` is a graphic. `null`, `false` and `undefined` keep the drop, so
 * a conditional `pin={spot && <Graphic />}` falls back to it.
 */
function hasCustomPin(pin: ReactNode) {
  return pin != null && typeof pin !== 'boolean'
}

/**
 * The pin's shape: a solid drop whose point sits on its place, or the app's
 * own graphic, whose bottom centre does.
 */
export function MapPin({ intent, icon, pin }: MapPinLook) {
  if (hasCustomPin(pin))
    return (
      <span data-slot='map-pin-graphic' className='grid'>
        {pin}
      </span>
    )
  return (
    <span
      data-slot='map-pin'
      className={cn(
        'grid size-8 rotate-45 place-content-center rounded-full rounded-br-none emphasis-strong shadow-md',
        intent && intentVariants[intent]
      )}
    >
      <span className='grid -rotate-45 place-content-center [&_svg]:size-4'>
        {icon ?? <span className='size-2.5 rounded-full bg-current' />}
      </span>
    </span>
  )
}

/**
 * Classes that hang a pin on its anchor. The drop's point hangs below its
 * box, so padding lifts it onto the anchor; a custom graphic sits on it.
 */
export function pinAnchorClass(pin: ReactNode) {
  return cn(
    'absolute top-0 left-0 z-1 grid -translate-x-1/2 -translate-y-full focus-within:z-2',
    !hasCustomPin(pin) && 'pb-1.5'
  )
}

/** The focus ring's shape: round on the drop, softly square on a graphic. */
export function pinRingClass(pin: ReactNode) {
  return hasCustomPin(pin) ? 'rounded-md' : 'rounded-full'
}
