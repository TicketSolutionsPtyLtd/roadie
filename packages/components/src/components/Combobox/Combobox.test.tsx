import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Combobox, type ComboboxProps, comboboxInputGroupVariants } from '.'
import { Field } from '../Field'

describe('Combobox', () => {
  it('Combobox and Combobox.Root are the same component reference', () => {
    expect(Combobox).toBe(Combobox.Root)
  })

  it('renders root component', () => {
    const { container } = render(
      <Combobox>
        <Combobox.InputGroup>
          <Combobox.Input placeholder='Search...' />
          <Combobox.Trigger />
        </Combobox.InputGroup>
      </Combobox>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders InputGroup with default variant classes', () => {
    const classes = comboboxInputGroupVariants()
    expect(classes).toContain('emphasis-field')
    expect(classes).toContain('is-interactive-field-group')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders InputGroup with different intents', () => {
    expect(comboboxInputGroupVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(comboboxInputGroupVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
  })

  it('renders InputGroup with different emphasis', () => {
    expect(comboboxInputGroupVariants({ emphasis: 'normal' })).toContain(
      'emphasis-field'
    )
    expect(comboboxInputGroupVariants({ emphasis: 'subtle' })).toContain(
      'bg-subtle'
    )
  })

  it('renders InputGroup with different sizes', () => {
    for (const [size, height] of [
      ['sm', 'min-h-8'],
      ['md', 'min-h-10'],
      ['lg', 'min-h-12']
    ] as const) {
      const classes = comboboxInputGroupVariants({ size })
      expect(classes.split(' ')).toContain(height)
      expect(classes).not.toMatch(/(^|\s)h-\d/)
    }
  })

  it('renders Label sub-component', () => {
    const { getByText } = render(
      <Combobox>
        <Combobox.Label>Search items</Combobox.Label>
        <Combobox.InputGroup>
          <Combobox.Input />
        </Combobox.InputGroup>
      </Combobox>
    )
    expect(getByText('Search items')).toBeInTheDocument()
  })

  it('renders with custom className on InputGroup', () => {
    const classes = comboboxInputGroupVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('Combobox input gets aria attributes from Field context', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Label>Venue</Field.Label>
        <Combobox>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Search...' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
        </Combobox>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('standalone Combobox works without Field', () => {
    const { container } = render(
      <Combobox>
        <Combobox.InputGroup>
          <Combobox.Input placeholder='Search...' />
          <Combobox.Trigger />
        </Combobox.InputGroup>
      </Combobox>
    )
    const input = container.querySelector('input')!
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-required')
  })
})

describe('Combobox value types', () => {
  it('types a single value, with null for a cleared one', () => {
    ;<Combobox
      items={['Rock', 'Jazz']}
      value='Rock'
      onValueChange={(value) => {
        expectTypeOf(value).toEqualTypeOf<string | null>()
      }}
    />
  })

  it('types a multiple value as an array', () => {
    ;<Combobox
      items={['Rock', 'Jazz']}
      multiple
      value={['Rock']}
      onValueChange={(value) => {
        expectTypeOf(value).toEqualTypeOf<string[]>()
      }}
    />
  })

  it('takes an array handler once multiple is set', () => {
    const onValueChange = (value: string[]) => value
    ;<Combobox multiple defaultValue={['Jazz']} onValueChange={onValueChange} />
    // @ts-expect-error a single combobox hands over one value, not an array
    ;<Combobox defaultValue='Jazz' onValueChange={onValueChange} />
  })

  it('types the props of a wrapper', () => {
    expectTypeOf<ComboboxProps<string>['value']>().toEqualTypeOf<
      string | null | undefined
    >()
    expectTypeOf<ComboboxProps<string, true>['value']>().toEqualTypeOf<
      string[] | null | undefined
    >()
  })
})

function Genres(props: Partial<ComboboxProps<string>>) {
  return (
    <Combobox items={['Rock', 'Jazz', 'Folk']} {...props}>
      <Combobox.InputGroup>
        <Combobox.Input aria-label='Genre' />
        <Combobox.Trigger aria-label='Show genres' />
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {(genre: string) => (
                <Combobox.Item key={genre} value={genre}>
                  {genre}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

const genreInput = () => screen.getByRole('combobox', { name: 'Genre' })

describe('Combobox first match', () => {
  it('picks the first match on Enter after typing', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.type(genreInput(), 'o')
    await screen.findByRole('option', { name: 'Folk' })
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('Rock', expect.anything())
    expect(genreInput()).toHaveValue('Rock')
  })

  it('points the input at the highlighted match for screen readers', async () => {
    render(<Genres />)
    await userEvent.type(genreInput(), 'o')
    const first = await screen.findByRole('option', { name: 'Rock' })
    await waitFor(() =>
      expect(genreInput()).toHaveAttribute('aria-activedescendant', first.id)
    )
  })

  it('picks nothing on Enter after opening without typing', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show genres' }))
    const first = await screen.findByRole('option', { name: 'Rock' })
    expect(first).not.toHaveAttribute('data-highlighted')
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('adds the first match as a chip on Enter with multiple', async () => {
    const onValueChange = vi.fn()
    render(
      <Combobox
        multiple
        items={['Rock', 'Jazz', 'Folk']}
        onValueChange={onValueChange}
      >
        <Combobox.InputGroup>
          <Combobox.Chips>
            <Combobox.Input aria-label='Genre' />
          </Combobox.Chips>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                {(genre: string) => (
                  <Combobox.Item key={genre} value={genre}>
                    {genre}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox>
    )
    await userEvent.type(genreInput(), 'o')
    await screen.findByRole('option', { name: 'Folk' })
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['Rock'], expect.anything())
  })

  it('picks nothing on Enter with autoHighlight off', async () => {
    const onValueChange = vi.fn()
    render(<Genres autoHighlight={false} onValueChange={onValueChange} />)
    await userEvent.type(genreInput(), 'o')
    await screen.findByRole('option', { name: 'Folk' })
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
