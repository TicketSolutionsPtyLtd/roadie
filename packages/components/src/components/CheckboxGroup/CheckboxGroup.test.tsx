import { useState } from 'react'

import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CheckboxGroup, checkboxGroupVariants } from '.'
import { Field } from '../Field'

const genres = ['rock', 'jazz', 'hip-hop']

function GenreFilter({ initial = [] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial)
  return (
    <CheckboxGroup value={value} onValueChange={setValue} allValues={genres}>
      <CheckboxGroup.Item parent label='All genres' />
      <CheckboxGroup.Item value='rock' label='Rock' />
      <CheckboxGroup.Item value='jazz' label='Jazz' />
      <CheckboxGroup.Item value='hip-hop' label='Hip hop' />
    </CheckboxGroup>
  )
}

describe('CheckboxGroup', () => {
  it('renders a group of labelled checkboxes', () => {
    const { getByRole, getAllByRole } = render(
      <CheckboxGroup>
        <CheckboxGroup.Item value='rock' label='Rock' />
        <CheckboxGroup.Item value='jazz' label='Jazz' />
      </CheckboxGroup>
    )
    expect(getByRole('group')).toHaveAttribute('data-slot', 'checkbox-group')
    expect(getAllByRole('checkbox')).toHaveLength(2)
  })

  it('tracks the ticked values', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { getByText } = render(
      <CheckboxGroup defaultValue={['rock']} onValueChange={onValueChange}>
        <CheckboxGroup.Item value='rock' label='Rock' />
        <CheckboxGroup.Item value='jazz' label='Jazz' />
      </CheckboxGroup>
    )
    await user.click(getByText('Jazz'))
    expect(onValueChange).toHaveBeenCalledWith(
      ['rock', 'jazz'],
      expect.anything()
    )
  })

  it('shows the parent as mixed when some children are ticked', () => {
    const { getByRole } = render(<GenreFilter initial={['rock']} />)
    expect(getByRole('checkbox', { name: 'All genres' })).toHaveAttribute(
      'aria-checked',
      'mixed'
    )
  })

  it('ticks every child from the parent', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = render(<GenreFilter />)
    await user.click(getByText('All genres'))
    for (const name of ['Rock', 'Jazz', 'Hip hop']) {
      expect(getByRole('checkbox', { name })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    }
    expect(getByRole('checkbox', { name: 'All genres' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('stacks vertically by default and lays out horizontally on request', () => {
    expect(checkboxGroupVariants()).toContain('flex-col')
    expect(checkboxGroupVariants({ direction: 'horizontal' })).toContain(
      'flex-row'
    )
  })

  it('items inherit emphasis from the root', () => {
    const { container } = render(
      <CheckboxGroup emphasis='normal'>
        <CheckboxGroup.Item value='rock' label='Rock' />
      </CheckboxGroup>
    )
    expect(container.querySelector('[data-slot="checkbox"]')).toHaveClass(
      'emphasis-normal'
    )
  })

  it('disables every item', () => {
    const { getAllByRole } = render(
      <CheckboxGroup disabled>
        <CheckboxGroup.Item value='rock' label='Rock' />
        <CheckboxGroup.Item value='jazz' label='Jazz' />
      </CheckboxGroup>
    )
    for (const checkbox of getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    }
  })

  it('shows ErrorText only when invalid', () => {
    const { queryByText, rerender } = render(
      <CheckboxGroup>
        <CheckboxGroup.ErrorText>Pick a genre</CheckboxGroup.ErrorText>
      </CheckboxGroup>
    )
    expect(queryByText('Pick a genre')).not.toBeInTheDocument()
    rerender(
      <CheckboxGroup invalid>
        <CheckboxGroup.ErrorText>Pick a genre</CheckboxGroup.ErrorText>
      </CheckboxGroup>
    )
    expect(queryByText('Pick a genre')).toHaveAttribute('role', 'alert')
  })

  it('renders required and optional indicators on Label', () => {
    const { getByText, rerender } = render(
      <CheckboxGroup required>
        <CheckboxGroup.Label showIndicator>Genres</CheckboxGroup.Label>
      </CheckboxGroup>
    )
    expect(getByText('*')).toBeInTheDocument()
    rerender(
      <CheckboxGroup>
        <CheckboxGroup.Label showIndicator>Genres</CheckboxGroup.Label>
      </CheckboxGroup>
    )
    expect(getByText('(optional)')).toBeInTheDocument()
  })

  it('is named by its Label', () => {
    const { getByRole } = render(
      <CheckboxGroup>
        <CheckboxGroup.Label>Genres</CheckboxGroup.Label>
        <CheckboxGroup.Item value='rock' label='Rock' />
      </CheckboxGroup>
    )
    expect(getByRole('group', { name: 'Genres' })).toBeInTheDocument()
  })

  it('renders HelperText', () => {
    const { getByText } = render(
      <CheckboxGroup>
        <CheckboxGroup.HelperText>Pick any</CheckboxGroup.HelperText>
      </CheckboxGroup>
    )
    expect(getByText('Pick any')).toHaveAttribute(
      'data-slot',
      'checkbox-group-helper-text'
    )
  })

  describe('in a Field', () => {
    it('is labelled by Field.Label and described by its helper text', () => {
      const { getByRole } = render(
        <Field>
          <Field.Label>Genres</Field.Label>
          <CheckboxGroup>
            <CheckboxGroup.Item value='rock' label='Rock' />
          </CheckboxGroup>
          <Field.HelperText>Pick any</Field.HelperText>
        </Field>
      )
      const group = getByRole('group', { name: 'Genres' })
      expect(group).toHaveAccessibleDescription('Pick any')
    })

    it('inherits disabled and invalid', () => {
      const { getByRole } = render(
        <Field invalid disabled>
          <Field.Label>Genres</Field.Label>
          <CheckboxGroup>
            <CheckboxGroup.Item value='rock' label='Rock' />
          </CheckboxGroup>
          <Field.ErrorText>Pick a genre</Field.ErrorText>
        </Field>
      )
      expect(getByRole('group')).toHaveAccessibleDescription('Pick a genre')
      expect(getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true')
    })

    it('does not give items the Field id', () => {
      const { getAllByRole } = render(
        <Field>
          <CheckboxGroup>
            <CheckboxGroup.Item value='rock' label='Rock' />
            <CheckboxGroup.Item value='jazz' label='Jazz' />
          </CheckboxGroup>
        </Field>
      )
      const [rock, jazz] = getAllByRole('checkbox')
      expect(rock).not.toHaveAttribute('aria-describedby')
      expect(jazz).not.toHaveAttribute('aria-describedby')
    })
  })
})
