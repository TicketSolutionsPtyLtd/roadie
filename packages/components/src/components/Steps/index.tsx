// Subpath entry for `@oztix/roadie-components/steps`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { StepsCompletedContent } from './StepsCompletedContent'
import { StepsContent } from './StepsContent'
import { StepsContext } from './StepsContext'
import { StepsIndicator } from './StepsIndicator'
import { StepsItem } from './StepsItem'
import { StepsItemContext } from './StepsItemContext'
import { StepsList } from './StepsList'
import { StepsNextTrigger } from './StepsNextTrigger'
import { StepsPrevTrigger } from './StepsPrevTrigger'
import { StepsProgress } from './StepsProgress'
import { StepsRoot } from './StepsRoot'
import { StepsRootProvider } from './StepsRootProvider'
import { StepsSeparator } from './StepsSeparator'
import { StepsTrigger } from './StepsTrigger'
import { StepsTriggerText } from './StepsTriggerText'

const Steps = StepsRoot as typeof StepsRoot & {
  Root: typeof StepsRoot
  List: typeof StepsList
  Item: typeof StepsItem
  Trigger: typeof StepsTrigger
  TriggerText: typeof StepsTriggerText
  Indicator: typeof StepsIndicator
  Separator: typeof StepsSeparator
  Content: typeof StepsContent
  CompletedContent: typeof StepsCompletedContent
  NextTrigger: typeof StepsNextTrigger
  PrevTrigger: typeof StepsPrevTrigger
  Progress: typeof StepsProgress
  Context: typeof StepsContext
  ItemContext: typeof StepsItemContext
  RootProvider: typeof StepsRootProvider
}

Steps.Root = StepsRoot
Steps.List = StepsList
Steps.Item = StepsItem
Steps.Trigger = StepsTrigger
Steps.TriggerText = StepsTriggerText
Steps.Indicator = StepsIndicator
Steps.Separator = StepsSeparator
Steps.Content = StepsContent
Steps.CompletedContent = StepsCompletedContent
Steps.NextTrigger = StepsNextTrigger
Steps.PrevTrigger = StepsPrevTrigger
Steps.Progress = StepsProgress
Steps.Context = StepsContext
Steps.ItemContext = StepsItemContext
Steps.RootProvider = StepsRootProvider

export { Steps }
export type { StepsRootProps as StepsProps } from './StepsRoot'
export type { StepsListProps } from './StepsList'
export type { StepsItemProps } from './StepsItem'
export type { StepsTriggerProps } from './StepsTrigger'
export type { StepsTriggerTextProps } from './StepsTriggerText'
export type { StepsIndicatorProps } from './StepsIndicator'
export type { StepsSeparatorProps } from './StepsSeparator'
export type { StepsContentProps } from './StepsContent'
export type { StepsCompletedContentProps } from './StepsCompletedContent'
export type { StepsNextTriggerProps } from './StepsNextTrigger'
export type { StepsPrevTriggerProps } from './StepsPrevTrigger'
export type { StepsProgressProps } from './StepsProgress'
export type { StepsContextProps } from './StepsContext'
export type { StepsItemContextProps } from './StepsItemContext'
export type { StepsRootProviderProps } from './StepsRootProvider'
export { stepsVariants } from './variants'
export { useSteps, type UseStepsProps, type UseStepsReturn } from './useSteps'
