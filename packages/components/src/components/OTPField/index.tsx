// No 'use client': dot access must work from server components.
import { OTPFieldInput } from './OTPFieldInput'
import { OTPFieldRoot } from './OTPFieldRoot'
import { OTPFieldSeparator } from './OTPFieldSeparator'

const OTPField = OTPFieldRoot as typeof OTPFieldRoot & {
  Root: typeof OTPFieldRoot
  Input: typeof OTPFieldInput
  Separator: typeof OTPFieldSeparator
}

OTPField.Root = OTPFieldRoot
OTPField.Input = OTPFieldInput
OTPField.Separator = OTPFieldSeparator

export { OTPField }
export type { OTPFieldRootProps as OTPFieldProps } from './OTPFieldRoot'
export type { OTPFieldInputProps } from './OTPFieldInput'
export type { OTPFieldSeparatorProps } from './OTPFieldSeparator'
export {
  otpFieldInputVariants,
  type OTPFieldEmphasis,
  type OTPFieldSize
} from './variants'
