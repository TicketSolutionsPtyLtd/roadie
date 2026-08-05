import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

type NavIconProps = {
  weight?: string
  className?: string
  'data-slot'?: string
}

/**
 * Navigator owns its destinations' icon presentation: weight follows active
 * state (active ⇒ `fill`, else `bold`) and size follows context, both
 * overriding whatever the consumer passed. This injects onto the single icon
 * element handed to us — not the banned "clone children to derive structure".
 *
 * `dataSlot` is optional because rail and strip icons already carry their own
 * slot on a wrapping element — only the tab bar tags the icon itself, which is
 * what the tap-bounce utility targets.
 */
export function presentNavIcon(
  icon: ReactNode,
  active: boolean,
  size: string,
  dataSlot?: string
): ReactNode {
  if (!isValidElement<NavIconProps>(icon)) return icon
  const el = icon as ReactElement<NavIconProps>
  return cloneElement(el, {
    weight: active ? 'fill' : 'bold',
    className: cn(el.props.className, size),
    ...(dataSlot ? { 'data-slot': dataSlot } : {})
  })
}
