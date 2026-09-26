'use client'

import type { RefAttributes } from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { disclosureCaretClass } from '../../variants'

export type CollapsibleTriggerProps = CollapsiblePrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement> & {
    /** Show a trailing caret that turns when the panel opens. */
    showCaret?: boolean
  }

export function CollapsibleTrigger({
  className,
  children,
  showCaret = true,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot='collapsible-trigger'
      className={cn(
        'group/collapsible-trigger',
        // A rendered element, such as Button, brings its own styles.
        !props.render &&
          'is-interactive -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium hover:bg-subtle',
        className
      )}
      {...props}
    >
      {children}
      {showCaret && (
        <CaretDownIcon
          data-slot='collapsible-indicator'
          aria-hidden
          weight='bold'
          className={cn(
            disclosureCaretClass,
            // On a rendered Button the caret keeps the button's text colour.
            !props.render && 'text-subtle',
            'group-data-[panel-open]/collapsible-trigger:rotate-180'
          )}
        />
      )}
    </CollapsiblePrimitive.Trigger>
  )
}

CollapsibleTrigger.displayName = 'Collapsible.Trigger'
