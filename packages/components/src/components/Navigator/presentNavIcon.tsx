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

// Duotone is the Navigator exception to the bold default (AGENTS.md → Iconography).
export function presentNavIcon(
  icon: ReactNode,
  size: string,
  dataSlot?: string
): ReactNode {
  if (!isValidElement<NavIconProps>(icon)) return icon
  const el = icon as ReactElement<NavIconProps>
  return cloneElement(el, {
    weight: 'duotone',
    className: cn(el.props.className, size),
    ...(dataSlot ? { 'data-slot': dataSlot } : {})
  })
}
