import { Select } from '.'
import { allowing } from '../../utils/hydrationTestUtils'
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

const bands = ['Powderfinger', 'Custard', 'Regurgitator', 'Violent Soho']

const summary = { ticket: 'INNO-1702', shift: 57 }

export const MultipleNarrow = allowing(
  () => (
    <Field className='w-48'>
      <Field.Label>Bands to see</Field.Label>
      <Select multiple defaultValue={bands}>
        <Select.Trigger>
          <Select.Value placeholder='Pick bands' />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          {bands.map((band) => (
            <Select.Item key={band} value={band}>
              {band}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </Field>
  ),
  { 390: summary, 1280: summary }
)
