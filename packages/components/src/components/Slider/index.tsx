// No 'use client': dot access must work from server components.
import { SliderControl } from './SliderControl'
import { SliderIndicator } from './SliderIndicator'
import { SliderLabel } from './SliderLabel'
import { SliderRoot } from './SliderRoot'
import { SliderThumb } from './SliderThumb'
import { SliderTrack } from './SliderTrack'
import { SliderValue } from './SliderValue'

const Slider = SliderRoot as typeof SliderRoot & {
  Root: typeof SliderRoot
  Label: typeof SliderLabel
  Value: typeof SliderValue
  Control: typeof SliderControl
  Track: typeof SliderTrack
  Indicator: typeof SliderIndicator
  Thumb: typeof SliderThumb
}

Slider.Root = SliderRoot
Slider.Label = SliderLabel
Slider.Value = SliderValue
Slider.Control = SliderControl
Slider.Track = SliderTrack
Slider.Indicator = SliderIndicator
Slider.Thumb = SliderThumb

export { Slider }
export type { SliderRootProps as SliderProps } from './SliderRoot'
export type { SliderLabelProps } from './SliderLabel'
export type { SliderValueProps } from './SliderValue'
export type { SliderControlProps } from './SliderControl'
export type { SliderTrackProps } from './SliderTrack'
export type { SliderIndicatorProps } from './SliderIndicator'
export type { SliderThumbProps } from './SliderThumb'
