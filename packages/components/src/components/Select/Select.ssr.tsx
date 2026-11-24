import { Select } from '.'
import { Field } from '../Field'

export const WithValue = () => (
  <Field>
    <Field.Label>Favourite band</Field.Label>
    <Select defaultValue='Custard'>
      <Select.Trigger>
        <Select.Value placeholder='Pick a band' />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value='Custard'>Custard</Select.Item>
        <Select.Item value='Regurgitator'>Regurgitator</Select.Item>
      </Select.Content>
    </Select>
  </Field>
)
