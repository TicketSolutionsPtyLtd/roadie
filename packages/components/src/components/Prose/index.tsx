import type { ComponentProps, ElementType, ReactElement } from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'

export const proseVariants = cva('prose', {
  variants: {
    size: {
      sm: [
        '[--prose-size:var(--text-sm)] [--prose-flow:1em]',
        '[--prose-h1-size:var(--text-4xl)] [--prose-h1-weight:700]',
        '[--prose-h2-size:var(--text-3xl)] [--prose-h2-weight:700]',
        '[--prose-h3-size:var(--text-2xl)] [--prose-h3-weight:700]',
        '[--prose-h4-size:var(--text-xl)] [--prose-h4-weight:700]',
        '[--prose-h5-size:var(--text-lg)] [--prose-h5-weight:600]',
        '[--prose-h6-size:var(--text-base)] [--prose-h6-weight:600]'
      ],
      md: '',
      lg: '[--prose-size:var(--text-lg)]'
    }
  },
  defaultVariants: {
    size: 'md'
  }
})

export type ProseProps<T extends ElementType = 'div'> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
   */
  as?: T
  /**
   * Swaps the underlying element with full control over its shape, such as
   * `render={<article />}`.
   */
  render?: RoadieRenderProp
  className?: string
  /**
   * Body size and heading scale. `sm` uses the UI heading styles for dense
   * content such as an FAQ; `md` and `lg` use the prose heading styles.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
} & Omit<ComponentProps<T>, 'as' | 'className' | 'size' | 'render'>

/**
 * Prose container for long-form/rich content (CMS output, markdown, user HTML).
 * Renders the core `.prose` class, which styles the nested HTML.
 */
export function Prose<T extends ElementType = 'div'>({
  as,
  render,
  className,
  size,
  ...props
}: ProseProps<T>): ReactElement {
  const finalProps = {
    'data-slot': 'prose',
    className: cn(proseVariants({ size, className })),
    ...props
  }

  if (render !== undefined) return resolveRender('div', finalProps, render)

  const Component = (as ?? 'div') as ElementType
  return <Component {...finalProps} />
}

Prose.displayName = 'Prose'
