'use client'

import type { ComponentProps, ReactNode } from 'react'

import { XIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { IconButton } from '../Button/IconButton'
import { CalloutContext } from './CalloutContext'
import { CalloutDescription } from './CalloutDescription'
import { CalloutIcon } from './CalloutIcon'
import { CalloutTitle } from './CalloutTitle'
import { type CalloutEmphasis, calloutVariants } from './variants'

export type CalloutProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** Palette, and the default icon for `info`, `success`, `warning` and `danger`. Omit to inherit from an ancestor. */
  intent?: RoadieIntent
  /** @default 'subtle' */
  emphasis?: CalloutEmphasis
  /** Short form: renders the title, the intent's icon and the children as the description. */
  title?: ReactNode
  /** Short form only: replaces the intent's icon. Pass `null` for none. */
  icon?: ReactNode
  /** Shows a dismiss button. You own the visibility: stop rendering the callout here. */
  onDismiss?: () => void
  /** @default 'Dismiss' */
  dismissLabel?: string
}

function isShortForm(title: ReactNode, children: ReactNode) {
  return (
    title !== undefined ||
    typeof children === 'string' ||
    typeof children === 'number'
  )
}

/** An inline message in the flow of the page. */
export function CalloutRoot({
  className,
  intent,
  emphasis = 'subtle',
  title,
  icon,
  onDismiss,
  dismissLabel = 'Dismiss',
  children,
  ...props
}: CalloutProps) {
  return (
    <CalloutContext value={intent}>
      <div
        data-slot='callout'
        className={cn(calloutVariants({ intent, emphasis }), className)}
        {...props}
      >
        {isShortForm(title, children) ? (
          <>
            {icon !== null && icon !== false && (
              <CalloutIcon>{icon}</CalloutIcon>
            )}
            {title !== undefined && <CalloutTitle>{title}</CalloutTitle>}
            {children != null && children !== '' && (
              <CalloutDescription>{children}</CalloutDescription>
            )}
          </>
        ) : (
          children
        )}
        {onDismiss && (
          <IconButton
            data-slot='callout-dismiss'
            aria-label={dismissLabel}
            size='sm'
            emphasis={emphasis === 'strong' ? 'strong' : 'subtler'}
            onClick={onDismiss}
            className='col-start-4 row-span-3 row-start-1 -my-1.5 ms-2 -me-2'
          >
            <XIcon weight='bold' className='size-4' />
          </IconButton>
        )}
      </div>
    </CalloutContext>
  )
}

CalloutRoot.displayName = 'Callout.Root'
