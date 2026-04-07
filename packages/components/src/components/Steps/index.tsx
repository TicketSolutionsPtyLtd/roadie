'use client'

import { type ComponentProps, forwardRef } from 'react'

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
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      'brand-secondary': 'intent-brand-secondary',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    orientation: {
      horizontal: '',
      vertical: 'grid-cols-[auto_1fr] gap-3'
    }
  },
  defaultVariants: {
    orientation: 'horizontal'
  }
})

/* ─── Root ─── */

export interface StepsProps
  extends Omit<ComponentProps<typeof ArkSteps.Root>, 'orientation'>,
    VariantProps<typeof stepsVariants> {}

const StepsRoot = forwardRef<HTMLDivElement, StepsProps>(
  ({ intent, orientation, className, ...props }, ref) => (
    <ArkSteps.Root
      ref={ref}
      orientation={orientation ?? 'horizontal'}
      className={cn(stepsVariants({ intent, orientation, className }))}
      {...props}
    />
  )
)

StepsRoot.displayName = 'Steps'

/* ─── List ─── */

type StepsListProps = ComponentProps<typeof ArkSteps.List>

function StepsList({ className, ...props }: StepsListProps) {
  return (
    <ArkSteps.List
      className={cn(
        'flex items-start justify-start rounded-md bg-subtler px-2',
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
  className?: string
  children?: React.ReactNode
}

function StepsItem({ className, ...props }: StepsItemProps) {
  // Ark UI's types lose `index` in the HTMLProps intersection (upstream bug).
  // Cast is safe — index is required by the Zag.js state machine at runtime.
  const Item = ArkSteps.Item as React.ComponentType<StepsItemProps>
  return (
    <Item
      className={cn(
        'flex flex-1 items-center last:flex-none',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        className
      )}
      {...props}
    />
  )
}

StepsItem.displayName = 'Steps.Item'

/* ─── Trigger ─── */

type StepsTriggerProps = ComponentProps<typeof ArkSteps.Trigger>

function StepsTrigger({ className, ...props }: StepsTriggerProps) {
  return (
    <ArkSteps.Trigger
      className={cn(
        'flex cursor-pointer flex-col items-center gap-1 rounded-md border-none bg-transparent px-2 py-2 transition-all duration-200 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-center data-[orientation=vertical]:gap-2',
        className
      )}
      {...props}
    />
  )
}

StepsTrigger.displayName = 'Steps.Trigger'

/* ─── Indicator ─── */

type StepsIndicatorProps = ComponentProps<typeof ArkSteps.Indicator>

function StepsIndicator({
  className,
  children,
  ...props
}: StepsIndicatorProps) {
  return (
    <ArkSteps.Indicator
      className={cn(
        'group flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-black transition-all duration-200 ease-out',
        'border-subtle bg-raised text-subtler',
        'data-[current]:border-strong data-[current]:bg-subtle data-[current]:text-normal',
        'data-[complete]:border-transparent data-[complete]:bg-strong data-[complete]:text-inverted',
        className
      )}
      {...props}
    >
      <span className='group-data-[complete]:hidden'>{children}</span>
      <CheckIcon
        weight='bold'
        className='hidden size-4 group-data-[complete]:block'
      />
    </ArkSteps.Indicator>
  )
}

StepsIndicator.displayName = 'Steps.Indicator'

/* ─── Separator ─── */

type StepsSeparatorProps = ComponentProps<typeof ArkSteps.Separator>

function StepsSeparator({ className, ...props }: StepsSeparatorProps) {
  return (
    <ArkSteps.Separator
      className={cn(
        'h-0.5 flex-1 bg-subtler transition-all duration-200 ease-out',
        'data-[complete]:bg-strong',
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

type StepsCompletedContentProps = ComponentProps<
  typeof ArkSteps.CompletedContent
>

function StepsCompletedContent({
  className,
  ...props
}: StepsCompletedContentProps) {
  return <ArkSteps.CompletedContent className={cn(className)} {...props} />
}

StepsCompletedContent.displayName = 'Steps.CompletedContent'

/* ─── NextTrigger ─── */

type StepsNextTriggerProps = ComponentProps<typeof ArkSteps.NextTrigger>

function StepsNextTrigger({ className, ...props }: StepsNextTriggerProps) {
  return <ArkSteps.NextTrigger className={cn(className)} {...props} />
}

StepsNextTrigger.displayName = 'Steps.NextTrigger'

/* ─── PrevTrigger ─── */

type StepsPrevTriggerProps = ComponentProps<typeof ArkSteps.PrevTrigger>

function StepsPrevTrigger({ className, ...props }: StepsPrevTriggerProps) {
  return <ArkSteps.PrevTrigger className={cn(className)} {...props} />
}

StepsPrevTrigger.displayName = 'Steps.PrevTrigger'

/* ─── Progress ─── */

type StepsProgressProps = ComponentProps<typeof ArkSteps.Progress>

function StepsProgress({ className, ...props }: StepsProgressProps) {
  return (
    <ArkSteps.Progress
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-sm bg-subtler',
        'after:absolute after:inset-y-0 after:left-0 after:w-[calc(var(--percent)*1%)] after:bg-strong after:transition-[width] after:duration-300 after:ease-out',
        className
      )}
      {...props}
    />
  )
}

StepsProgress.displayName = 'Steps.Progress'

/* ─── Compound export ─── */

export const Steps = Object.assign(StepsRoot, {
  List: StepsList,
  Item: StepsItem,
  Trigger: StepsTrigger,
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
