import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type VariantProps } from 'class-variance-authority'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  Select,
  type SelectProps,
  type SelectTriggerProps,
  selectTriggerVariants
} from '.'
import { Field } from '../Field'

describe('Select', () => {
  it('keeps the deprecated intent prop accepting what it did before', () => {
    expectTypeOf<SelectTriggerProps['intent']>().toEqualTypeOf<
      VariantProps<typeof selectTriggerVariants>['intent']
    >()
  })

  it('Select and Select.Root are the same component reference', () => {
    expect(Select).toBe(Select.Root)
  })

  it('renders root component', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders Trigger with default variant classes', () => {
    const classes = selectTriggerVariants()
    expect(classes).toContain('emphasis-raised')
    expect(classes).toContain('is-interactive-field')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders Trigger with different intents', () => {
    expect(selectTriggerVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(selectTriggerVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
    expect(selectTriggerVariants({ intent: 'success' })).toContain(
      'intent-success'
    )
  })

  it('renders Trigger with different emphasis', () => {
    expect(selectTriggerVariants({ emphasis: 'normal' })).toContain(
      'emphasis-raised'
    )
    expect(selectTriggerVariants({ emphasis: 'subtle' })).toContain('bg-subtle')
  })

  it('renders Trigger with different sizes', () => {
    expect(selectTriggerVariants({ size: 'sm' })).toContain('h-8')
    expect(selectTriggerVariants({ size: 'md' })).toContain('h-10')
    expect(selectTriggerVariants({ size: 'lg' })).toContain('h-12')
  })

  it('renders Label sub-component', () => {
    const { getByText } = render(
      <Select>
        <Select.Label>Choose option</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('Choose option')).toBeInTheDocument()
  })

  it('renders with custom className on Trigger', () => {
    const classes = selectTriggerVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('hides ErrorText when invalid is not set', () => {
    const { queryByText } = render(
      <Select>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(queryByText('Error message')).not.toBeInTheDocument()
  })

  it('hides ErrorText when invalid is false', () => {
    const { queryByText } = render(
      <Select invalid={false}>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(queryByText('Error message')).not.toBeInTheDocument()
  })

  it('shows ErrorText when invalid is true', () => {
    const { getByText } = render(
      <Select invalid>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(getByText('Error message')).toBeInTheDocument()
  })

  it('renders RequiredIndicator on Label when showIndicator and required', () => {
    const { getByText } = render(
      <Select required>
        <Select.Label showIndicator>Industry</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('*')).toBeInTheDocument()
  })

  it('renders OptionalIndicator on Label when showIndicator and not required', () => {
    const { getByText } = render(
      <Select>
        <Select.Label showIndicator>Industry</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('(optional)')).toBeInTheDocument()
  })

  it('renders Content convenience wrapper', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='a'>Option A</Select.Item>
        </Select.Content>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('auto-wraps string children in Item with ItemText and ItemIndicator', () => {
    const { container } = render(
      <Select defaultValue='a'>
        <Select.Trigger>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='a'>Option A</Select.Item>
        </Select.Content>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('inherits invalid from Field context', () => {
    const { container } = render(
      <Field invalid>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
  })

  it('standalone Select still works without Field', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).not.toHaveAttribute('aria-labelledby')
    expect(trigger).not.toHaveAttribute('aria-invalid')
  })

  it('Select props override Field context', () => {
    const { container } = render(
      <Field invalid>
        <Select invalid={false}>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
      </Field>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).not.toHaveAttribute('aria-invalid')
  })

  it('inherits disabled from Field context', () => {
    const { getByRole } = render(
      <Field disabled>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
          </Select.Trigger>
        </Select>
      </Field>
    )
    expect(getByRole('combobox')).toHaveAttribute('data-disabled')
  })

  it('own disabled prop wins over Field context', () => {
    const { getByRole } = render(
      <Field disabled>
        <Select disabled={false}>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
          </Select.Trigger>
        </Select>
      </Field>
    )
    expect(getByRole('combobox')).not.toHaveAttribute('data-disabled')
  })
})

describe('Field text description', () => {
  it('stays on the helper text when only the control is invalid', () => {
    const { getByRole } = render(
      <Field>
        <Field.Label>Industry</Field.Label>
        <Select invalid>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
          </Select.Trigger>
        </Select>
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('combobox')).toHaveAccessibleDescription('Helper')
  })

  it('points at the error text when the Field is invalid', () => {
    const { getByRole } = render(
      <Field invalid>
        <Field.Label>Industry</Field.Label>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
          </Select.Trigger>
        </Select>
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('combobox')).toHaveAccessibleDescription('Error')
  })
})

function Bands(props: SelectProps) {
  return (
    <Select {...props}>
      <Select.Trigger aria-label='Band'>
        <Select.Value placeholder='Pick a band' />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value='bee-gees'>Bee Gees</Select.Item>
        {['go-betweens'].map((value) => (
          <Select.Item key={value} value={value}>
            The Go-Betweens
          </Select.Item>
        ))}
        <Select.Group>
          <Select.Item value='custard'>
            <Select.ItemText>Custard</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        </Select.Group>
      </Select.Content>
    </Select>
  )
}

describe('Select value label', () => {
  it('shows the item label for a default value on first render', () => {
    const { getByRole } = render(<Bands defaultValue='go-betweens' />)
    expect(getByRole('combobox')).toHaveTextContent('The Go-Betweens')
  })

  it('shows the label when rendered on the server', () => {
    expect(renderToStaticMarkup(<Bands defaultValue='bee-gees' />)).toContain(
      'Bee Gees'
    )
  })

  it('reads the label from Select.ItemText', () => {
    const { getByRole } = render(<Bands defaultValue='custard' />)
    expect(getByRole('combobox')).toHaveTextContent('Custard')
  })

  it('shows the label of the item picked', async () => {
    const user = userEvent.setup()
    const { getByRole, findByRole } = render(<Bands />)
    await user.click(getByRole('combobox'))
    await user.click(await findByRole('option', { name: 'Bee Gees' }))
    expect(getByRole('combobox')).toHaveTextContent('Bee Gees')
  })

  it('shows the label of an item from a component it cannot see', async () => {
    function Band() {
      return <Select.Item value='regurgitator'>Regurgitator</Select.Item>
    }
    const user = userEvent.setup()
    const { getByRole, findByRole } = render(
      <Select>
        <Select.Trigger aria-label='Band'>
          <Select.Value placeholder='Pick a band' />
        </Select.Trigger>
        <Select.Content>
          <Band />
        </Select.Content>
      </Select>
    )
    await user.click(getByRole('combobox'))
    await user.click(await findByRole('option', { name: 'Regurgitator' }))
    expect(getByRole('combobox')).toHaveTextContent('Regurgitator')
  })

  it('keeps labels from explicit items', () => {
    const { getByRole } = render(
      <Bands defaultValue='bee-gees' items={{ 'bee-gees': 'The Bee Gees' }} />
    )
    expect(getByRole('combobox')).toHaveTextContent('The Bee Gees')
  })

  it('keeps labels from itemToStringLabel', () => {
    const { getByRole } = render(
      <Bands
        defaultValue='bee-gees'
        itemToStringLabel={(value) => String(value).toUpperCase()}
      />
    )
    expect(getByRole('combobox')).toHaveTextContent('BEE-GEES')
  })

  it('lists the labels of every value in a multiple select', () => {
    const { getByRole } = render(
      // @ts-expect-error Roadie's Select types don't take `multiple` yet
      <Bands multiple defaultValue={['bee-gees', 'custard']} />
    )
    expect(getByRole('combobox')).toHaveTextContent('Bee Gees, Custard')
  })
})
