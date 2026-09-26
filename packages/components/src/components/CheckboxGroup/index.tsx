// No 'use client': dot access must work from server components.
import { CheckboxGroupErrorText } from './CheckboxGroupErrorText'
import { CheckboxGroupHelperText } from './CheckboxGroupHelperText'
import { CheckboxGroupItem } from './CheckboxGroupItem'
import { CheckboxGroupLabel } from './CheckboxGroupLabel'
import { CheckboxGroupRoot } from './CheckboxGroupRoot'

const CheckboxGroup = CheckboxGroupRoot as typeof CheckboxGroupRoot & {
  Root: typeof CheckboxGroupRoot
  Item: typeof CheckboxGroupItem
  Label: typeof CheckboxGroupLabel
  HelperText: typeof CheckboxGroupHelperText
  ErrorText: typeof CheckboxGroupErrorText
}

CheckboxGroup.Root = CheckboxGroupRoot
CheckboxGroup.Item = CheckboxGroupItem
CheckboxGroup.Label = CheckboxGroupLabel
CheckboxGroup.HelperText = CheckboxGroupHelperText
CheckboxGroup.ErrorText = CheckboxGroupErrorText

export { CheckboxGroup }
export type { CheckboxGroupRootProps as CheckboxGroupProps } from './CheckboxGroupRoot'
export type { CheckboxGroupItemProps } from './CheckboxGroupItem'
export type { CheckboxGroupLabelProps } from './CheckboxGroupLabel'
export type { CheckboxGroupHelperTextProps } from './CheckboxGroupHelperText'
export type { CheckboxGroupErrorTextProps } from './CheckboxGroupErrorText'
export { checkboxGroupVariants } from './variants'
