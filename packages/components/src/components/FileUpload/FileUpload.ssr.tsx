import { FileUpload } from '.'
import { Field } from '../Field'

export const Empty = () => (
  <Field className='w-72'>
    <Field.Label>Guest list</Field.Label>
    <FileUpload name='guests' accept='.csv' />
  </Field>
)
