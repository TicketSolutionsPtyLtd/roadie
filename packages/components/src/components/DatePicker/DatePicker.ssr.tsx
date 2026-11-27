import { DatePicker } from '.'
import { Field } from '../Field'

export const WithValue = () => (
  <Field className='w-64'>
    <Field.Label>Show date</Field.Label>
    <DatePicker defaultValue='2026-11-27' />
  </Field>
)
