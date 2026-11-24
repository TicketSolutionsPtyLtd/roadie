import { OTPField } from '.'
import { Field } from '../Field'

export const SixDigits = () => (
  <Field className='w-72'>
    <Field.Label>Login code</Field.Label>
    <OTPField length={6} />
  </Field>
)
