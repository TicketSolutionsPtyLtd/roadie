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
 * Navigator owns its destinations' icon weight and size, overriding the
 * consumer's. Only horizontal tabs pass `dataSlot`; other surfaces slot a
 * wrapper instead.
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
