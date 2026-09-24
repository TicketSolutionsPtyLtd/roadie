// No 'use client': dot access must work from server components.
import { NumberFieldDecrement } from './NumberFieldDecrement'
import { NumberFieldGroup } from './NumberFieldGroup'
import { NumberFieldIncrement } from './NumberFieldIncrement'
import { NumberFieldInput } from './NumberFieldInput'
import { NumberFieldRoot } from './NumberFieldRoot'
import { NumberFieldScrubArea } from './NumberFieldScrubArea'
import { NumberFieldScrubAreaCursor } from './NumberFieldScrubAreaCursor'

const NumberField = NumberFieldRoot as typeof NumberFieldRoot & {
  Root: typeof NumberFieldRoot
  Group: typeof NumberFieldGroup
  Input: typeof NumberFieldInput
  Decrement: typeof NumberFieldDecrement
  Increment: typeof NumberFieldIncrement
  ScrubArea: typeof NumberFieldScrubArea
  ScrubAreaCursor: typeof NumberFieldScrubAreaCursor
}

NumberField.Root = NumberFieldRoot
NumberField.Group = NumberFieldGroup
NumberField.Input = NumberFieldInput
NumberField.Decrement = NumberFieldDecrement
NumberField.Increment = NumberFieldIncrement
NumberField.ScrubArea = NumberFieldScrubArea
NumberField.ScrubAreaCursor = NumberFieldScrubAreaCursor

export { NumberField }
export type { NumberFieldRootProps as NumberFieldProps } from './NumberFieldRoot'
export type { NumberFieldGroupProps } from './NumberFieldGroup'
export type { NumberFieldInputProps } from './NumberFieldInput'
export type { NumberFieldDecrementProps } from './NumberFieldDecrement'
export type { NumberFieldIncrementProps } from './NumberFieldIncrement'
export type { NumberFieldScrubAreaProps } from './NumberFieldScrubArea'
export type { NumberFieldScrubAreaCursorProps } from './NumberFieldScrubAreaCursor'
export {
  numberFieldGroupVariants,
  type NumberFieldEmphasis,
  type NumberFieldSize,
  type NumberFieldStepperEmphasis
} from './variants'
