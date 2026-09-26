import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RadioGroup, radioGroupItemVariants, radioGroupVariants } from '.'
import { Field } from '../Field'

describe('RadioGroup', () => {
  it('renders with default props', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with vertical direction by default', () => {
    const classes = radioGroupVariants()
    expect(classes).toContain('flex-col')
  })

  it('renders with horizontal direction', () => {
    const classes = radioGroupVariants({ direction: 'horizontal' })
    expect(classes).toContain('flex-row')
  })

  it('renders Item with subtler emphasis by default', () => {
    const classes = radioGroupItemVariants()
    expect(classes).toContain('gap-2')
    expect(classes).toContain('emphasis-subtler')
  })

  it('renders Item with normal emphasis', () => {
    const classes = radioGroupItemVariants({ emphasis: 'normal' })
    expect(classes).toContain('rounded-xl')
    expect(classes).toContain('emphasis-normal')
  })

  it('items inherit emphasis from Root', () => {
    const { container } = render(
      <RadioGroup emphasis='normal'>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    const label = container.querySelector('label')!
    expect(label).toHaveClass('emphasis-normal')
    expect(label).toHaveClass('rounded-xl')
  })

  it('items default to subtler emphasis', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    const label = container.querySelector('label')!
    expect(label).toHaveClass('emphasis-subtler')
  })

  it('renders Item with label text', () => {
    const { getByText } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
        <RadioGroup.Item value='b' label='Option B' />
      </RadioGroup>
    )
    expect(getByText('Option A')).toBeInTheDocument()
    expect(getByText('Option B')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const classes = radioGroupVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('applies custom className to Item', () => {
    const classes = radioGroupItemVariants({ className: 'custom-item' })
    expect(classes).toContain('custom-item')
  })

  it('hides ErrorText when invalid is not set', () => {
    const { queryByText } = render(
      <RadioGroup>
        <RadioGroup.ErrorText>Error message</RadioGroup.ErrorText>
      </RadioGroup>
    )
    expect(queryByText('Error message')).not.toBeInTheDocument()
  })

  it('hides ErrorText when invalid is false', () => {
    const { queryByText } = render(
      <RadioGroup invalid={false}>
        <RadioGroup.ErrorText>Error message</RadioGroup.ErrorText>
      </RadioGroup>
    )
    expect(queryByText('Error message')).not.toBeInTheDocument()
  })

  it('shows ErrorText when invalid is true', () => {
    const { getByText } = render(
      <RadioGroup invalid>
        <RadioGroup.ErrorText>Error message</RadioGroup.ErrorText>
      </RadioGroup>
    )
    expect(getByText('Error message')).toBeInTheDocument()
  })

  it('renders RequiredIndicator on Label when showIndicator and required', () => {
    const { getByText } = render(
      <RadioGroup required>
        <RadioGroup.Label showIndicator>Choose one</RadioGroup.Label>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    expect(getByText('*')).toBeInTheDocument()
  })

  it('renders OptionalIndicator on Label when showIndicator and not required', () => {
    const { getByText } = render(
      <RadioGroup>
        <RadioGroup.Label showIndicator>Choose one</RadioGroup.Label>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    expect(getByText('(optional)')).toBeInTheDocument()
  })

  it('inherits invalid from Field context', () => {
    const { container } = render(
      <Field invalid>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument()
  })

  it('standalone RadioGroup still works without Field', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    const radioGroup = container.querySelector('[role="radiogroup"]')!
    expect(radioGroup).not.toHaveAttribute('aria-labelledby')
  })

  it('RadioGroup props override Field context', () => {
    const { queryByText } = render(
      <Field invalid>
        <RadioGroup invalid={false}>
          <RadioGroup.Item value='a' label='Option A' />
          <RadioGroup.ErrorText>Should be hidden</RadioGroup.ErrorText>
        </RadioGroup>
      </Field>
    )
    expect(queryByText('Should be hidden')).not.toBeInTheDocument()
  })

  it('inherits disabled from Field context', () => {
    const { getAllByRole } = render(
      <Field disabled>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
          <RadioGroup.Item value='phone' label='Phone' />
        </RadioGroup>
      </Field>
    )
    for (const radio of getAllByRole('radio')) {
      expect(radio).toHaveAttribute('data-disabled')
    }
  })

  it('own disabled prop wins over Field context', () => {
    const { getByRole } = render(
      <Field disabled>
        <RadioGroup disabled={false}>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
      </Field>
    )
    expect(getByRole('radio')).not.toHaveAttribute('data-disabled')
  })

  it.each(['subtler', 'normal'] as const)(
    'describes rather than names an item with its description (%s)',
    (emphasis) => {
      const { getByRole } = render(
        <RadioGroup emphasis={emphasis}>
          <RadioGroup.Item
            value='email'
            label='Email'
            description='We reply within a day'
          />
        </RadioGroup>
      )
      const radio = getByRole('radio', { name: 'Email' })
      expect(radio).toHaveAccessibleDescription('We reply within a day')
    }
  )

  it('accepts nodes for label and description', () => {
    const { getByRole } = render(
      <RadioGroup emphasis='normal'>
        <RadioGroup.Item
          value='email'
          label={<strong>Email</strong>}
          description={<em>We reply within a day</em>}
        />
      </RadioGroup>
    )
    const radio = getByRole('radio', { name: 'Email' })
    expect(radio).toHaveAccessibleDescription('We reply within a day')
  })

  it('keeps a numeric zero label and description', () => {
    const { getByRole } = render(
      <RadioGroup>
        <RadioGroup.Item value='none' label={0} description={0} />
      </RadioGroup>
    )
    const radio = getByRole('radio', { name: '0' })
    expect(radio).toHaveAccessibleDescription('0')
  })

  it.each([false, '', null])(
    'renders no label or description for %j',
    (empty) => {
      const { getByRole, container } = render(
        <RadioGroup>
          <RadioGroup.Item value='email' label={empty} description={empty} />
        </RadioGroup>
      )
      expect(getByRole('radio')).not.toHaveAttribute('aria-describedby')
      expect(
        container.querySelector('[data-slot="radio-group-item"]')?.textContent
      ).toBe('')
    }
  )

  it('names the group with RadioGroup.Label', () => {
    const { getByRole } = render(
      <RadioGroup>
        <RadioGroup.Label>Contact method</RadioGroup.Label>
        <RadioGroup.Item value='email' label='Email' />
      </RadioGroup>
    )
    expect(
      getByRole('radiogroup', { name: 'Contact method' })
    ).toBeInTheDocument()
  })

  it('names the group with Field.Label inside a Field', () => {
    const { getByRole } = render(
      <Field>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
      </Field>
    )
    expect(
      getByRole('radiogroup', { name: 'Contact method' })
    ).toBeInTheDocument()
  })
})

describe('Field text description', () => {
  it('stays on the helper text when only the control is invalid', () => {
    const { getByRole } = render(
      <Field>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup invalid>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('radiogroup')).toHaveAccessibleDescription('Helper')
  })

  it('points at the error text when the Field is invalid', () => {
    const { getByRole } = render(
      <Field invalid>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('radiogroup')).toHaveAccessibleDescription('Error')
  })
})
