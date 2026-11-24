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
// for primary destinations only.
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

// A secondary row keeps the weight it was given. Phosphor defaults to regular,
// and the lint rule lets a Navigator.Item take a bare icon, so bold fills the gap.
export function presentSecondaryIcon(icon: ReactNode, size: string): ReactNode {
  if (!isValidElement<NavIconProps>(icon)) return icon
  const el = icon as ReactElement<NavIconProps>
  return cloneElement(el, {
    weight: el.props.weight ?? 'bold',
    className: cn(el.props.className, size)
  })
}

export function badgeDot(badge: ReactElement<BadgeProps>): ReactElement {
  return cloneElement(badge, {
    hideLabel: true,
    className: cn(badge.props.className, 'absolute end-1 top-1')
  })
}
