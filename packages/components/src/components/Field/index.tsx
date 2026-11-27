// Subpath entry for `@oztix/roadie-components/field`.
//
// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { FieldErrorText } from './FieldErrorText'
import { FieldHelperText } from './FieldHelperText'
import { FieldInput } from './FieldInput'
import { FieldLabel } from './FieldLabel'
import { FieldRoot } from './FieldRoot'
import { FieldTextarea } from './FieldTextarea'

const Field = FieldRoot as typeof FieldRoot & {
  Root: typeof FieldRoot
  Label: typeof FieldLabel
  Input: typeof FieldInput
  Textarea: typeof FieldTextarea
  HelperText: typeof FieldHelperText
  ErrorText: typeof FieldErrorText
}

Field.Root = FieldRoot
Field.Label = FieldLabel
Field.Input = FieldInput
Field.Textarea = FieldTextarea
Field.HelperText = FieldHelperText
Field.ErrorText = FieldErrorText

export { Field }
export type { FieldRootProps as FieldProps } from './FieldRoot'
export type { FieldLabelProps } from './FieldLabel'
export type { FieldInputProps } from './FieldInput'
export type { FieldTextareaProps } from './FieldTextarea'
export type { FieldHelperTextProps } from './FieldHelperText'
export type { FieldErrorTextProps } from './FieldErrorText'
// `FieldContext` is for a package's own control that holds other controls,
// such as a map with a search box: giving it an empty field stops them
// taking the outer field's label and error.
export {
  FieldContext,
  type FieldContextValue,
  useFieldContext,
  useFieldControlError,
  useFieldInputProps
} from './FieldContext'
