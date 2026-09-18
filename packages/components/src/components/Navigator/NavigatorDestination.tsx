'use client'

import type {
  AnchorHTMLAttributes,
  CSSProperties,
  ComponentProps,
  MouseEvent,
  ReactNode,
  Ref
} from 'react'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type NavigatorDestinationProps = Omit<
  ComponentProps<'button'>,
  'children' | 'onClick' | 'style' | 'className' | 'ref'
> & {
  /** Omit to render a `<button>`. */
  href?: string
  /** Set only on a collapsed edge circle, so the two circles are findable without classes. */
  circleSide?: 'start' | 'end'
  style?: CSSProperties
  /** `'page'` for a real destination, `'true'` for the More disclosure. */
  ariaCurrent?: 'page' | 'true'
  /** What the sliding indicator tracks, apart from `aria-current`. */
  dataCurrent?: boolean
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent) => void
  ref?: Ref<HTMLElement>
}

/** The one link-or-button for every destination, so the indicator finds it with one selector. */
export function NavigatorDestination({
  href,
  circleSide,
  ariaCurrent,
  dataCurrent,
  children,
  ref,
  ...rest
}: NavigatorDestinationProps) {
  const shared = {
    'data-slot': 'navigator-item',
    'data-circle-side': circleSide,
    'aria-current': ariaCurrent,
    'data-current': dataCurrent || undefined
  }
  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        {...shared}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
      >
        {children}
      </RoadieRoutedLink>
    )
  }

  return (
    <button
      type='button'
      {...rest}
      {...shared}
      ref={ref as Ref<HTMLButtonElement>}
    >
      {children}
    </button>
  )
}

NavigatorDestination.displayName = 'NavigatorDestination'
