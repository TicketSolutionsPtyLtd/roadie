'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type NavigatorDestinationProps = {
  /** Omit to render a `<button>`. */
  href?: string
  /**
   * Set only on a tab-bar tab that is currently a collapsed edge circle —
   * the one selector that finds the two circles without reading classes.
   */
  circleSide?: 'left' | 'right'
  /** Carries the tab's column index to the collapse geometry. */
  style?: CSSProperties
  /** `'page'` for a real destination, `'true'` for the More disclosure. */
  ariaCurrent?: 'page' | 'true'
  /**
   * Visual currency — what the sliding indicator tracks. Deliberately separate
   * from `aria-current`: a section sitting on a sub-route it never declared
   * should hold the pill without announcing itself as the page you are on.
   */
  dataCurrent?: boolean
  /** Set only on the disclosure, which is never a link. */
  expanded?: boolean
  controls?: string
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent) => void
}

/**
 * The single link-vs-button fork for every Navigator destination. Owning
 * `data-slot` and `aria-current` in one place is what lets the sliding
 * indicator find the active element with one selector across all three
 * surfaces.
 */
export function NavigatorDestination({
  href,
  circleSide,
  style,
  ariaCurrent,
  dataCurrent,
  expanded,
  controls,
  className,
  children,
  onClick
}: NavigatorDestinationProps) {
  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='navigator-item'
        data-circle-side={circleSide}
        style={style}
        aria-current={ariaCurrent}
        data-current={dataCurrent || undefined}
        className={className}
        href={href}
        onClick={onClick}
      >
        {children}
      </RoadieRoutedLink>
    )
  }

  return (
    <button
      type='button'
      data-slot='navigator-item'
      data-circle-side={circleSide}
      style={style}
      aria-current={ariaCurrent}
      data-current={dataCurrent || undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

NavigatorDestination.displayName = 'NavigatorDestination'
