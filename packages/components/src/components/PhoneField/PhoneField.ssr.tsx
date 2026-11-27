import { PhoneField } from '.'
import { Field } from '../Field'

export const Empty = () => (
  <Field className='w-80'>
    <Field.Label>Mobile number</Field.Label>
    <PhoneField />
  </Field>
)

export const Filled = () => (
  <Field className='w-80'>
    <Field.Label>Mobile number</Field.Label>
    <PhoneField defaultValue='+64211234567' />
  </Field>
)
