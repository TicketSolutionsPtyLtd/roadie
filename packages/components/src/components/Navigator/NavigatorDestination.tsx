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
  circleSide?: 'left' | 'right'
  style?: CSSProperties
  /** `'page'` for a real destination, `'true'` for the More disclosure. */
  ariaCurrent?: 'page' | 'true'
  /** What the sliding indicator tracks; separate from `aria-current` so a section on an undeclared sub-route holds the pill without claiming the page. */
  dataCurrent?: boolean
  /** Set only on the disclosure, which is never a link. */
  expanded?: boolean
  controls?: string
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent) => void
  ref?: Ref<HTMLElement>
}

/**
 * The single link-vs-button fork for every Navigator destination, so the
 * sliding indicator finds the active element with one selector on every
 * surface. Forwards the props and ref a Base UI `render` merges in.
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
  onClick,
  ref,
  ...rest
}: NavigatorDestinationProps) {
  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        ref={ref as Ref<HTMLAnchorElement>}
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
      {...rest}
      aria-expanded={expanded ?? rest['aria-expanded']}
      aria-controls={controls ?? rest['aria-controls']}
      ref={ref as Ref<HTMLButtonElement>}
      data-slot='navigator-item'
      data-circle-side={circleSide}
      style={style}
      aria-current={ariaCurrent}
      data-current={dataCurrent || undefined}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

NavigatorDestination.displayName = 'NavigatorDestination'
