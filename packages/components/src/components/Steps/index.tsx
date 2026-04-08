'use client'

import { type ComponentProps, useCallback, useEffect, useRef } from 'react'

import {
  Steps as ArkSteps,
  type UseStepsProps,
  type UseStepsReturn,
  useSteps
} from '@ark-ui/react/steps'
import { CheckIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Re-exports ─── */

export { useSteps, type UseStepsProps, type UseStepsReturn }

/* ─── Root variants ─── */

export const stepsVariants = cva('grid w-full gap-4', {
  variants: {
    direction: {
      horizontal: '',
      vertical: 'grid-cols-[auto_1fr] gap-3'
    }
  },
  defaultVariants: {
    direction: 'horizontal'
  }
})

/* ─── Root ─── */

export type StepsProps = Omit<ArkSteps.RootProps, 'orientation'> &
  VariantProps<typeof stepsVariants>

function StepsRoot({ direction, className, ...props }: StepsProps) {
  return (
    <ArkSteps.Root
      orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      className={cn(stepsVariants({ direction, className }))}
      {...props}
    />
  )
}

StepsRoot.displayName = 'Steps'

/* ─── List ─── */

type StepsListProps = ArkSteps.ListProps

function StepsList({ className, ...props }: StepsListProps) {
  return (
    <ArkSteps.List
      className={cn(
        'flex items-start justify-start rounded-xl bg-subtler px-4 py-3',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-2',
        className
      )}
      {...props}
    />
  )
}

StepsList.displayName = 'Steps.List'

/* ─── Item ─── */

export interface StepsItemProps {
  index: number
  invalid?: boolean
  className?: string
  children?: React.ReactNode
}

interface StepsItemInternalProps extends StepsItemProps {
  ref?: React.Ref<HTMLDivElement>
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

function StepsItem({ className, invalid, ...props }: StepsItemProps) {
  // Ark UI's types lose `index` in the HTMLProps intersection (upstream bug).
  // Cast is safe — index is required by the Zag.js state machine at runtime.
  const Item = ArkSteps.Item as React.ComponentType<
    Omit<StepsItemInternalProps, 'invalid'>
  >

  const itemRef = useRef<HTMLDivElement>(null)
  const prevInvalid = useRef(invalid)

  useEffect(() => {
    if (invalid && !prevInvalid.current) {
      const trigger = itemRef.current?.querySelector(
        '[data-part="trigger"]'
      ) as HTMLElement | null
      if (trigger) {
        trigger.classList.remove('animate-shake')
        void trigger.offsetWidth
        trigger.classList.add('animate-shake')
      }
    }
    prevInvalid.current = invalid
  }, [invalid])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const trigger = (e.currentTarget as HTMLElement).querySelector(
      '[data-part="trigger"]'
    ) as HTMLElement | null
    if (!trigger) return
    // In linear mode, Ark sets tabindex="-1" on non-current triggers
    // and the onClick returns early — the step doesn't change.
    // We detect this by checking tabindex and data-incomplete.
    const isLocked =
      trigger.getAttribute('tabindex') === '-1' &&
      trigger.hasAttribute('data-incomplete')
    if (!isLocked) return
    trigger.classList.remove('animate-shake')
    void trigger.offsetWidth
    trigger.classList.add('animate-shake')
  }, [])

  return (
    <Item
      ref={itemRef}
      className={cn(
        'group/step-item flex flex-1 items-center last:flex-none',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        className
      )}
      data-invalid={invalid || undefined}
      onClick={handleClick}
      {...props}
    />
  )
}

StepsItem.displayName = 'Steps.Item'

/* ─── Trigger ─── */

type StepsTriggerProps = ArkSteps.TriggerProps

function StepsTrigger({ className, ...props }: StepsTriggerProps) {
  return (
    <ArkSteps.Trigger
      className={cn(
        'group/step flex cursor-pointer flex-col items-center gap-1 rounded-md border-none bg-transparent px-3 py-3 transition-all duration-200 ease-out',
        'data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-center data-[orientation=vertical]:gap-2',
        'data-current:intent-accent',
        className
      )}
      {...props}
    />
  )
}

StepsTrigger.displayName = 'Steps.Trigger'

/* ─── Indicator ─── */

type StepsIndicatorProps = ArkSteps.IndicatorProps

function StepsIndicator({
  className,
  children,
  ...props
}: StepsIndicatorProps) {
  return (
    <ArkSteps.Indicator
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

/* ─── Separator ─── */

type StepsSeparatorProps = ArkSteps.SeparatorProps

function StepsSeparator({ className, ...props }: StepsSeparatorProps) {
  return (
    <ArkSteps.Separator
      className={cn(
        'h-0.5 flex-1 bg-subtle transition-all duration-200 ease-out md:bottom-0 md:translate-y-5.5',
        'data-complete:bg-strong',
        'data-[orientation=vertical]:ml-4 data-[orientation=vertical]:h-4 data-[orientation=vertical]:w-0.5',
        className
      )}
      {...props}
    />
  )
}

StepsSeparator.displayName = 'Steps.Separator'

/* ─── Content ─── */

interface StepsContentProps {
  index: number
  className?: string
  children?: React.ReactNode
}

function StepsContent({ className, ...props }: StepsContentProps) {
  const Content = ArkSteps.Content as React.ComponentType<StepsContentProps>
  return <Content className={cn(className)} {...props} />
}

StepsContent.displayName = 'Steps.Content'

/* ─── CompletedContent ─── */

type StepsCompletedContentProps = ArkSteps.CompletedContentProps

function StepsCompletedContent({
  className,
  ...props
}: StepsCompletedContentProps) {
  return <ArkSteps.CompletedContent className={cn(className)} {...props} />
}

StepsCompletedContent.displayName = 'Steps.CompletedContent'

/* ─── NextTrigger ─── */

type StepsNextTriggerProps = ArkSteps.NextTriggerProps

function StepsNextTrigger({ className, ...props }: StepsNextTriggerProps) {
  return <ArkSteps.NextTrigger className={cn(className)} {...props} />
}

StepsNextTrigger.displayName = 'Steps.NextTrigger'

/* ─── PrevTrigger ─── */

type StepsPrevTriggerProps = ArkSteps.PrevTriggerProps

function StepsPrevTrigger({ className, ...props }: StepsPrevTriggerProps) {
  return <ArkSteps.PrevTrigger className={cn(className)} {...props} />
}

StepsPrevTrigger.displayName = 'Steps.PrevTrigger'

/* ─── Progress ─── */

type StepsProgressProps = ArkSteps.ProgressProps

function StepsProgress({ className, ...props }: StepsProgressProps) {
  return (
    <ArkSteps.Progress
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-sm bg-subtle',
        'after:absolute after:inset-y-0 after:left-0 after:w-[calc(var(--percent)*1%)] after:bg-strong after:transition-[width] after:duration-300 after:ease-out',
        className
      )}
      {...props}
    />
  )
}

StepsProgress.displayName = 'Steps.Progress'

/* ─── TriggerText ─── */

type StepsTriggerTextProps = ComponentProps<'span'>

function StepsTriggerText({ className, ...props }: StepsTriggerTextProps) {
  return (
    <span
      className={cn(
        'hidden text-sm font-bold md:block',
        'group-data-incomplete/step:text-subtle',
        'group-data-current/step:text-subtle',
        'group-data-complete/step:text-normal',
        'group-data-invalid/step-item:text-subtle group-data-invalid/step-item:intent-danger',
        className
      )}
      {...props}
    />
  )
}

StepsTriggerText.displayName = 'Steps.TriggerText'

/* ─── Compound export ─── */

export const Steps = Object.assign(StepsRoot, {
  List: StepsList,
  Item: StepsItem,
  Trigger: StepsTrigger,
  TriggerText: StepsTriggerText,
  Indicator: StepsIndicator,
  Separator: StepsSeparator,
  Content: StepsContent,
  CompletedContent: StepsCompletedContent,
  NextTrigger: StepsNextTrigger,
  PrevTrigger: StepsPrevTrigger,
  Progress: StepsProgress,
  Context: ArkSteps.Context,
  ItemContext: ArkSteps.ItemContext,
  RootProvider: ArkSteps.RootProvider
})
