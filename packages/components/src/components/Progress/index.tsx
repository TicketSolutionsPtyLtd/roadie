// No 'use client': dot access must work from server components.
import { ProgressIndicator } from './ProgressIndicator'
import { ProgressLabel } from './ProgressLabel'
import { ProgressRoot } from './ProgressRoot'
import { ProgressTrack } from './ProgressTrack'
import { ProgressValue } from './ProgressValue'

const Progress = ProgressRoot as typeof ProgressRoot & {
  Root: typeof ProgressRoot
  Label: typeof ProgressLabel
  Value: typeof ProgressValue
  Track: typeof ProgressTrack
  Indicator: typeof ProgressIndicator
}

Progress.Root = ProgressRoot
Progress.Label = ProgressLabel
Progress.Value = ProgressValue
Progress.Track = ProgressTrack
Progress.Indicator = ProgressIndicator

export { Progress }
export type { ProgressRootProps as ProgressProps } from './ProgressRoot'
export type { ProgressLabelProps } from './ProgressLabel'
export type { ProgressValueProps } from './ProgressValue'
export type { ProgressTrackProps } from './ProgressTrack'
export type { ProgressIndicatorProps } from './ProgressIndicator'
