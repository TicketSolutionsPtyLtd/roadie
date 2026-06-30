import type { ComponentProps, ElementType, ReactElement } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'

export const markVariants = cva(
  'inline-block justify-self-start self-start px-[0.1em] py-[0.05em]',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        'neutral-inverted': 'intent-neutral',
        brand: 'intent-brand',
        'brand-secondary': 'intent-brand-secondary',
        accent: 'intent-accent',
        danger: 'intent-danger',
        success: 'intent-success',
        warning: 'intent-warning',
        info: 'intent-info'
      }
    },
    defaultVariants: { intent: 'info' }
  }
)

export type MarkProps<T extends ElementType = 'mark'> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
   */
  as?: T
  /**
   * Escape hatch — swap the underlying element with full control over the
   * rendered shape (e.g. `render={<h2 />}` to highlight a heading).
   */
  render?: RoadieRenderProp
  className?: string
} & VariantProps<typeof markVariants> &
  Omit<ComponentProps<T>, 'as' | 'className' | 'render'>

const headingElements = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export function Mark<T extends ElementType = 'mark'>({
  as,
  render,
  className,
  intent,
  ...props
}: MarkProps<T>): ReactElement {
  // Heading-aware padding follows the effective tag: explicit `as`, the tag of
  // an element-form `render`, else `mark`.
  const renderTag =
    render && typeof render !== 'function' && typeof render.type === 'string'
      ? render.type
      : undefined
  const tag = (as as ElementType | undefined) ?? renderTag ?? 'mark'
  const isHeading = typeof tag === 'string' && headingElements.has(tag)
  const isNeutralInverted = intent === 'neutral-inverted'

  const finalProps = {
    'data-slot': 'mark',
    className: cn(
      markVariants({ intent }),
      isNeutralInverted ? 'bg-neutral-0 text-neutral-13' : 'bg-mark text-mark',
      isHeading && 'px-[0.4em] py-[0.2em]',
      className
    ),
    ...props
  }

  if (render !== undefined) return resolveRender('mark', finalProps, render)

  const Component = (as ?? 'mark') as ElementType
  return <Component {...finalProps} />
}

Mark.displayName = 'Mark'
