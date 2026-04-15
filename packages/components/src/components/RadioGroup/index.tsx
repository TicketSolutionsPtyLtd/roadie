// Subpath entry for `@oztix/roadie-components/radio-group`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { RadioGroupErrorText } from './RadioGroupErrorText'
import { RadioGroupHelperText } from './RadioGroupHelperText'
import { RadioGroupItem } from './RadioGroupItem'
import { RadioGroupLabel } from './RadioGroupLabel'
import { RadioGroupRoot } from './RadioGroupRoot'

const RadioGroup = RadioGroupRoot as typeof RadioGroupRoot & {
  Root: typeof RadioGroupRoot
  Item: typeof RadioGroupItem
  Label: typeof RadioGroupLabel
  HelperText: typeof RadioGroupHelperText
  ErrorText: typeof RadioGroupErrorText
}

RadioGroup.Root = RadioGroupRoot
RadioGroup.Item = RadioGroupItem
RadioGroup.Label = RadioGroupLabel
RadioGroup.HelperText = RadioGroupHelperText
RadioGroup.ErrorText = RadioGroupErrorText

export { RadioGroup }
export type { RadioGroupRootProps as RadioGroupProps } from './RadioGroupRoot'
export type { RadioGroupItemProps } from './RadioGroupItem'
export type { RadioGroupLabelProps } from './RadioGroupLabel'
export type { RadioGroupHelperTextProps } from './RadioGroupHelperText'
export type { RadioGroupErrorTextProps } from './RadioGroupErrorText'
export { radioGroupVariants, radioGroupItemVariants } from './variants'
