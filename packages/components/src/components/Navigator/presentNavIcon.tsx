import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { BadgeProps } from '../Badge'

type NavIconProps = {
  weight?: string
  className?: string
  'data-slot'?: string
}

// Duotone is the Navigator exception to the bold default (AGENTS.md → Iconography),
// for primary destinations only; a secondary row keeps the weight it was given.
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

export function presentSecondaryIcon(icon: ReactNode, size: string): ReactNode {
  if (!isValidElement<NavIconProps>(icon)) return icon
  const el = icon as ReactElement<NavIconProps>
  return cloneElement(el, { className: cn(el.props.className, size) })
}

export function badgeDot(badge: ReactElement<BadgeProps>): ReactElement {
  return cloneElement(badge, {
    hideLabel: true,
    className: cn(badge.props.className, 'absolute end-1 top-1')
  })
}
