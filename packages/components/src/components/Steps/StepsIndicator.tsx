'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type StepsIndicatorProps = ArkSteps.IndicatorProps

export function StepsIndicator({
  className,
  children,
  ...props
}: StepsIndicatorProps) {
  return (
    <ArkSteps.Indicator
      data-slot='steps-indicator'
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border text-lg font-black outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-all duration-200 ease-out',
        'border-subtle bg-raised text-subtler',
        'group-hover/step:outline-[length:var(--focus-ring-width)]',
        'data-current:border-normal data-current:bg-subtle data-current:text-subtle',
        'data-complete:emphasis-strong',
        'group-data-invalid/step-item:emphasis-normal group-data-invalid/step-item:border-normal group-data-invalid/step-item:bg-subtle group-data-invalid/step-item:text-subtle group-data-invalid/step-item:intent-danger',
        className
      )}
      {...props}
    >
      <span className='group-data-complete/step:hidden group-data-invalid/step-item:!block'>
        {children}
      </span>
      <CheckIcon
        weight='bold'
        className='hidden size-5 group-data-complete/step:block group-data-invalid/step-item:!hidden'
      />
    </ArkSteps.Indicator>
  )
}

StepsIndicator.displayName = 'Steps.Indicator'
