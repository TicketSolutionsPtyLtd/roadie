import type { AnchorHTMLAttributes, Ref } from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'
import { RoadieRoutedLink } from './RoadieRoutedLink'

const linkVariants = cva('', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal: 'link-normal',
      strong: 'link-strong',
      subtle: 'link-subtle'
    }
  },
  defaultVariants: {
    emphasis: 'normal'
  }
})

// Its own type, so an internal prop added to RoadieRoutedLink stays internal.
export type LinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  /**
   * Opens in a new tab when `true`, or routes through the Link given to
   * `RoadieProvider` when `false`. Unset, an `http(s)://` or `//` href is
   * external and any other is internal.
   */
  external?: boolean
  /**
   * How much the link stands out from the text around it. `normal` keeps
   * the text colour with an accent underline that grows into a tint on
   * hover, `strong` colours the text and fills from the left like `emphasis-strong`, and `subtle`
   * shows the underline only on hover or keyboard focus.
   * @default 'normal'
   */
  emphasis?: 'normal' | 'strong' | 'subtle'
  /**
   * Colours the link. Without it, `normal` and `subtle` stay accent inside
   * any intent, and `strong` follows the surrounding intent.
   */
  intent?: RoadieIntent
  ref?: Ref<HTMLAnchorElement>
}

/**
 * A text link that routes like every link-bearing Roadie component: internal
 * hrefs through the Link given to `RoadieProvider`, external ones in a new
 * tab, and unsafe ones refused.
 */
export function Link({ emphasis, intent, className, ...props }: LinkProps) {
  return (
    <RoadieRoutedLink
      data-slot='link'
      className={cn(linkVariants({ intent, emphasis }), className)}
      {...props}
    />
  )
}

Link.displayName = 'Link'
