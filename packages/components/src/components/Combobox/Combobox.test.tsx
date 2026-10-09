import { useState } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Combobox, type ComboboxProps, comboboxInputGroupVariants } from '.'
import { Field } from '../Field'

describe('Combobox', () => {
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

  it('highlights matches that arrive after typing', async () => {
    function Late() {
      const [items, setItems] = useState<string[]>([])
      return (
        <Genres
          items={items}
          filter={null}
          onInputValueChange={(text) =>
            setTimeout(() => setItems(text ? ['Rock', 'Folk'] : []))
          }
        />
      )
    }
    render(<Late />)
    await userEvent.type(genreInput(), 'o')
    const first = await screen.findByRole('option', { name: 'Rock' })
    await waitFor(() => expect(first).toHaveAttribute('data-highlighted'))
  })

  it('picks the first match after retyping over a chosen value', async () => {
    const onValueChange = vi.fn()
    render(<Genres defaultValue='Folk' onValueChange={onValueChange} />)
    await userEvent.clear(genreInput())
    await userEvent.type(genreInput(), 'o')
    await screen.findByRole('option', { name: 'Folk' })
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('Rock', expect.anything())
  })

  it('highlights the chosen value, not the first, when reopened', async () => {
    render(<Genres defaultValue='Folk' />)
    await userEvent.click(screen.getByRole('button', { name: 'Show genres' }))
    const folk = await screen.findByRole('option', { name: 'Folk' })
    await waitFor(() => expect(folk).toHaveAttribute('data-highlighted'))
    expect(screen.getByRole('option', { name: 'Rock' })).not.toHaveAttribute(
      'data-highlighted'
    )
  })

  it('highlights nothing after a controlled close and reopen', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Genres open={open} onOpenChange={setOpen} />
          <button type='button' data-close onClick={() => setOpen(false)}>
            Close
          </button>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.type(genreInput(), 'o')
    await screen.findByRole('option', { name: 'Folk' })
    fireEvent.click(document.querySelector('[data-close]')!)
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: 'Show genres' }))
    const first = await screen.findByRole('option', { name: 'Rock' })
    expect(first).not.toHaveAttribute('data-highlighted')
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

const optionNames = () =>
  screen.getAllByRole('option').map((option) => option.textContent)

type Genre = { value: string; items: string[] }

function GroupedGenres(props: Partial<ComboboxProps<string, false, Genre>>) {
  return (
    <Combobox
      items={[
        { value: 'Heavy', items: ['Hard rock', 'Rock', 'Metal'] },
        { value: 'Light', items: ['Soft rock', 'Rock and roll'] }
      ]}
      {...props}
    >
      <Combobox.Input aria-label='Genre' />
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {(group: Genre) => (
                <Combobox.Group key={group.value} items={group.items}>
                  <Combobox.GroupLabel>{group.value}</Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(genre: string) => (
                      <Combobox.Item key={genre} value={genre}>
                        {genre}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

describe('Combobox closest match', () => {
  it('picks the exact match on Enter, not the first in the list', async () => {
    const onValueChange = vi.fn()
    render(
      <Genres items={['Hard rock', 'Rock']} onValueChange={onValueChange} />
    )
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    expect(optionNames()).toEqual(['Rock', 'Hard rock'])
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('Rock', expect.anything())
  })

  it('holds the ranked order while the list closes', async () => {
    render(
      <Combobox items={['Hard rock', 'Rock']}>
        <Combobox.Input aria-label='Genre' />
        <Combobox.Portal keepMounted>
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
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull())
    expect(
      screen
        .getAllByRole('option', { hidden: true })
        .map((option) => option.textContent)
    ).toEqual(['Rock', 'Hard rock'])
  })

  it('keeps the closest matches within a limit', async () => {
    render(<Genres items={['Hard rock', 'Punk rock', 'Rock']} limit={2} />)
    await userEvent.type(genreInput(), 'rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    expect(optionNames()).toEqual(['Rock', 'Hard rock'])
  })

  it('fills a limit group by group in the given group order', async () => {
    render(
      <GroupedGenres
        limit={1}
        items={[
          { value: 'Heavy', items: ['Hard rock'] },
          { value: 'Light', items: ['Rock'] }
        ]}
      />
    )
    await userEvent.type(genreInput(), 'rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    expect(optionNames()).toEqual(['Hard rock'])
  })

  it('ranks matches within each group and keeps the group order', async () => {
    render(<GroupedGenres />)
    await userEvent.type(genreInput(), 'rock')
    await screen.findByRole('option', { name: 'Soft rock' })
    expect(optionNames()).toEqual([
      'Rock',
      'Hard rock',
      'Rock and roll',
      'Soft rock'
    ])
    const groups = screen.getAllByRole('group')
    expect(
      groups.map((group) => group.getAttribute('aria-labelledby'))
    ).toEqual([screen.getByText('Heavy').id, screen.getByText('Light').id])
  })

  it('shows the given order when opened without typing', async () => {
    render(<Genres items={['Hard rock', 'Rock']} defaultValue='Rock' />)
    await userEvent.click(screen.getByRole('button', { name: 'Show genres' }))
    await screen.findByRole('option', { name: 'Hard rock' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock'])
  })

  it('shows the given order when reopened after adding a chip', async () => {
    render(
      <Combobox multiple items={['Hard rock', 'Rock', 'Jazz']}>
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
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(genreInput()).toHaveValue(''))
    await userEvent.keyboard('{ArrowDown}')
    await screen.findByRole('option', { name: 'Jazz' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock', 'Jazz'])
  })

  it('shows the given order when reopened in code', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Genres
            items={['Hard rock', 'Rock']}
            open={open}
            onOpenChange={setOpen}
          />
          <button
            type='button'
            data-toggle
            onClick={() => setOpen((was) => !was)}
          >
            Toggle
          </button>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.type(genreInput(), 'r')
    await screen.findByRole('option', { name: 'Rock' })
    expect(optionNames()).toEqual(['Rock', 'Hard rock'])
    fireEvent.click(document.querySelector('[data-toggle]')!)
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull())
    fireEvent.click(document.querySelector('[data-toggle]')!)
    await screen.findByRole('option', { name: 'Rock' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock'])
  })

  it('ranks by the label itemToStringLabel gives', async () => {
    const genres = [
      { id: 1, name: 'Hard rock' },
      { id: 2, name: 'Rock' }
    ]
    render(
      <Combobox
        items={genres}
        itemToStringLabel={(genre) => (genre as { name: string }).name}
      >
        <Combobox.Input aria-label='Genre' />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                {(genre: { id: number; name: string }) => (
                  <Combobox.Item key={genre.id} value={genre}>
                    {genre.name}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox>
    )
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Hard rock' })
    expect(optionNames()).toEqual(['Rock', 'Hard rock'])
  })

  it('keeps the order a consumer filter gives', async () => {
    render(
      <Genres
        items={['Hard rock', 'Rock']}
        filter={(item: string, query) =>
          item.toLowerCase().includes(query.toLowerCase())
        }
      />
    )
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Rock' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock'])
  })

  it('keeps the order of filteredItems', async () => {
    render(
      <Genres
        items={['Hard rock', 'Rock']}
        filteredItems={['Hard rock', 'Rock']}
      />
    )
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Rock' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock'])
  })

  it('keeps the order of results with filter off', async () => {
    render(<Genres items={['Hard rock', 'Rock']} filter={null} />)
    await userEvent.type(genreInput(), 'Rock')
    await screen.findByRole('option', { name: 'Rock' })
    expect(optionNames()).toEqual(['Hard rock', 'Rock'])
  })
})
