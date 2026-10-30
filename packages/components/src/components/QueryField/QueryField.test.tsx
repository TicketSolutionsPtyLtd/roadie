import { createRef, useState } from 'react'

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { QueryField, type QueryFieldProps } from '.'
import { Field } from '../Field'
import type {
  QueryFieldChip,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from './types'

const venueField: QueryFieldSuggestion = {
  id: 'field:venue',
  label: 'Venue',
  kind: 'field',
  value: 'venue'
}
const iguana: QueryFieldSuggestion = {
  id: 'venue:iguana',
  label: 'Venue is Iguana Teapot Hall',
  kind: 'filter',
  value: 'iguana'
}
const order: QueryFieldSuggestion = {
  id: 'order:1042',
  label: 'Order 1042',
  description: 'Lampshade Disco, 2 tickets',
  kind: 'record',
  value: 1042,
  exact: true
}

function suggestFor(text: string): QueryFieldSuggestionGroup[] {
  if (text === '1042')
    return [{ id: 'records', label: 'Orders', items: [order] }]
  if (text)
    return [
      { id: 'filters', label: 'Filters', items: [iguana] },
      { id: 'fields', label: 'Fields', items: [venueField] }
    ]
  return [{ id: 'fields', label: 'Filter by', items: [venueField] }]
}

const scope: QueryFieldChip = {
  id: 'event',
  label: 'Event is Lampshade Disco',
  locked: true
}
const status: QueryFieldChip = { id: 'status', label: 'Status is On sale' }
const city: QueryFieldChip = { id: 'city', label: 'City is Perth' }

type HarnessProps = Partial<QueryFieldProps> & {
  initialChips?: QueryFieldChip[]
}

function Harness({ initialChips = [], ...props }: HarnessProps) {
  const [chips, setChips] = useState(initialChips)
  return (
    <QueryField
      aria-label='Search orders'
      chips={chips}
      onRemoveChip={(id) =>
        setChips((current) => current.filter((chip) => chip.id !== id))
      }
      suggest={suggestFor}
      {...props}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: 'Search orders' })
const chipNames = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map(
    (chip) => chip.querySelector('[data-slot=combobox-chip-label]')?.textContent
  )
const chipElement = (id: string) =>
  document.querySelector<HTMLElement>(
    `[data-slot=combobox-chip][data-chip-id="${id}"]`
  )
const hinted = () =>
  screen
    .queryAllByRole('option')
    .filter((option) => option.querySelector('kbd'))
    .map(
      (option) =>
        option.querySelector('[data-slot=query-field-option-label]')
          ?.textContent
    )
const optionNames = () =>
  screen
    .queryAllByRole('option')
    .map(
      (option) =>
        option.querySelector('[data-slot=query-field-option-label]')
          ?.textContent
    )

async function typeInto(text: string) {
  await userEvent.click(input())
  await userEvent.keyboard(text)
}

describe('QueryField', () => {
  it('lists the row Enter takes first, its group ahead of the rest, and Down moves past it', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('venue')
    await waitFor(() =>
      expect(optionNames()).toEqual([
        'Search for “venue”',
        'Venue is Iguana Teapot Hall',
        'Venue'
      ])
    )
    expect(hinted()).toEqual(['Search for “venue”'])
    await userEvent.keyboard('{ArrowDown}')
    expect(hinted()).toEqual(['Venue is Iguana Teapot Hall'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(iguana)
  })

  it('highlights the row Enter takes, and Up from the next row returns to it', async () => {
    render(<Harness />)
    await typeInto('venue')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    const row = (name: RegExp) => screen.getByRole('option', { name })
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      row(/^Search for/).id
    )
    expect(row(/^Search for/)).toHaveAttribute('data-highlighted')
    await userEvent.keyboard('{ArrowDown}')
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      row(/^Venue is/).id
    )
    await userEvent.keyboard('{ArrowUp}')
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      row(/^Search for/).id
    )
    expect(hinted()).toEqual(['Search for “venue”'])
  })

  it('lists a value step’s Enter target first in its group', async () => {
    const onAccept = vi.fn()
    render(
      <Harness
        pendingChip={{ id: 'city', label: 'City is', chipId: 'city' }}
        initialChips={[city]}
        onAccept={onAccept}
        suggest={() => [
          {
            id: 'values',
            label: 'City',
            items: [
              {
                id: 'perth',
                label: 'Perth',
                kind: 'filter',
                value: 'Perth',
                selected: true
              },
              {
                id: 'penrith',
                label: 'Penrith',
                kind: 'filter',
                value: 'Penrith'
              }
            ]
          }
        ]}
      />
    )
    await typeInto('pe')
    await waitFor(() => expect(optionNames()).toEqual(['Penrith', 'Perth']))
    expect(hinted()).toEqual(['Penrith'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'penrith' })
    )
  })

  it('is a search field named by aria-label, with default copy', () => {
    render(<Harness />)
    expect(input()).toHaveAttribute('placeholder', 'Search and filter')
    expect(
      document.querySelector('[data-slot=query-field] svg')
    ).toBeInTheDocument()
  })

  it('takes its label, invalid, disabled and required from Field', () => {
    render(
      <Field invalid disabled required>
        <Field.Label>Find orders</Field.Label>
        <QueryField suggest={suggestFor} />
      </Field>
    )
    const field = screen.getByRole('combobox', { name: 'Find orders' })
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAttribute('aria-required', 'true')
    expect(field).toBeDisabled()
    expect(document.querySelector('[data-slot=query-field]')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('marks itself invalid on its own', () => {
    render(<Harness invalid />)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })

  it('puts locked chips first, with no remove button', () => {
    render(<Harness initialChips={[status, scope, city]} />)
    expect(chipNames()).toEqual([
      'Event is Lampshade Disco',
      'Status is On sale',
      'City is Perth'
    ])
    expect(
      screen.queryByRole('button', { name: 'Remove Event is Lampshade Disco' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove City is Perth' })
    ).toBeInTheDocument()
  })

  it('drops the placeholder once there are chips', () => {
    render(<Harness initialChips={[status]} />)
    expect(input()).toHaveAttribute('placeholder', '')
  })

  it('lists free-text search, which Enter takes, then suggestions in the order given', async () => {
    render(<Harness />)
    await typeInto('igua')
    await waitFor(() =>
      expect(optionNames()).toEqual([
        'Search for “igua”',
        'Venue is Iguana Teapot Hall',
        'Venue'
      ])
    )
  })

  it('lists recent items above the fields on an empty field', async () => {
    render(<Harness recent={[iguana]} />)
    await userEvent.click(input())
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is Iguana Teapot Hall', 'Venue'])
    )
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('searches the free text on Enter, never taking a filter it was not moved to', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledWith({
      id: 'search',
      kind: 'search',
      label: 'Search for “igua”',
      value: 'igua'
    })
    expect(input()).toHaveValue('igua')
  })

  it.each([
    ['a list of its own', suggestFor],
    ['no list of its own', (text: string) => (text ? [] : suggestFor(text))]
  ])(
    'highlights nothing once typed text is deleted, with %s',
    async (_, suggest) => {
      const onAccept = vi.fn()
      render(<Harness suggest={suggest} onAccept={onAccept} />)
      await typeInto('v')
      await waitFor(() => expect(hinted()).toEqual(['Search for “v”']))
      await userEvent.keyboard('{Backspace}')
      await screen.findByRole('option', { name: 'Venue' })
      expect(input()).not.toHaveAttribute('aria-activedescendant')
      expect(hinted()).toEqual([])
      await userEvent.keyboard('{Enter}')
      expect(onAccept).not.toHaveBeenCalled()
    }
  )

  it('highlights only the row Enter takes while typing', async () => {
    render(<Harness />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    const highlighted = document.querySelectorAll('[data-highlighted]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveAccessibleName(/^Search for “long”/)
    expect(input()).toHaveAttribute('aria-activedescendant', highlighted[0]!.id)
  })

  it('searches on Enter once Escape closes the list', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(hinted()).toEqual(['Search for “igua”']))
    await userEvent.keyboard('{Escape}')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ kind: 'search', label: 'Search for “igua”' })
    )
  })

  it('takes an exact identifier on Enter', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('1042')
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledWith(order)
  })

  it('takes a filter moved to with the arrows, and clears the text', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenCalledWith(iguana)
    expect(input()).toHaveValue('')
  })

  it('takes a clicked suggestion', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await userEvent.click(
      await screen.findByRole('option', { name: /Venue is Iguana Teapot Hall/ })
    )
    expect(onAccept).toHaveBeenCalledWith(iguana)
    expect(chipNames()).toEqual([])
  })

  it('shows the Enter hint on the suggestion Enter would take', async () => {
    render(<Harness />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    expect(hinted()).toEqual(['Search for “igua”'])
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() =>
      expect(hinted()).toEqual(['Venue is Iguana Teapot Hall'])
    )
  })

  it('keeps the list open on a field, for the value step', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: /Venue/ }))
    expect(onAccept).toHaveBeenCalledWith(venueField)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('asks for suggestions again when the pending chip changes', async () => {
    const suggest = vi.fn(suggestFor)
    const { rerender } = render(<Harness suggest={suggest} />)
    await userEvent.click(input())
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1))
    rerender(
      <Harness
        suggest={suggest}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
      />
    )
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(2))
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Venue is')
  })

  it('goes back from the value step with Backspace or Escape', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        initialChips={[status]}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    await userEvent.keyboard('{Backspace}')
    await userEvent.keyboard('{Escape}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(2)
    expect(chipNames()).toEqual(['Status is On sale'])
  })

  it('selects, then removes, the last chip with Backspace on an empty field', async () => {
    render(<Harness initialChips={[scope, status, city]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toHaveLength(3)
    expect(document.activeElement).toBe(chipElement('city'))
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toEqual([
      'Event is Lampshade Disco',
      'Status is On sale'
    ])
    expect(document.activeElement).toBe(input())
  })

  it('never removes a locked chip from the keyboard', async () => {
    render(<Harness initialChips={[scope]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}{Backspace}')
    expect(chipNames()).toEqual(['Event is Lampshade Disco'])
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(chipElement('event'))
    await userEvent.keyboard('{Delete}{Backspace}')
    expect(chipNames()).toEqual(['Event is Lampshade Disco'])
  })

  it('keeps every chip on Escape with the list closed', async () => {
    render(<Harness initialChips={[scope, status]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(chipNames()).toHaveLength(2)
  })

  it('removes a chip with its remove button', async () => {
    render(<Harness initialChips={[scope, status]} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Status is On sale' })
    )
    expect(chipNames()).toEqual(['Event is Lampshade Disco'])
  })

  it('selects a chip on click, Enter or Space, keeping focus in the input', async () => {
    const onSelectChip = vi.fn()
    render(
      <Harness initialChips={[scope, status]} onSelectChip={onSelectChip} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Status is On sale' })
    )
    expect(onSelectChip).toHaveBeenLastCalledWith('status')
    expect(document.activeElement).toBe(input())
    for (const key of ['{Enter}', ' ']) {
      chipElement('status')!.focus()
      await userEvent.keyboard(key)
      expect(document.activeElement).toBe(input())
    }
    expect(onSelectChip).toHaveBeenCalledTimes(3)
    expect(
      screen.queryByRole('button', { name: /Event is Lampshade Disco/ })
    ).not.toBeInTheDocument()
  })

  it('opens the list only once a step edits the selected chip', async () => {
    function Selecting() {
      const [editing, setEditing] = useState<string>()
      return (
        <Harness
          initialChips={[status, city]}
          onSelectChip={(id) => {
            if (id === 'status') setEditing(id)
          }}
          pendingChip={
            editing
              ? { id: 'status', label: 'Status is', chipId: editing }
              : undefined
          }
          onPendingChipCancel={() => setEditing(undefined)}
        />
      )
    }
    render(<Selecting />)
    await userEvent.click(screen.getByRole('button', { name: 'City is Perth' }))
    expect(document.activeElement).toBe(input())
    expect(screen.queryByRole('listbox')).toBeNull()
    await userEvent.click(
      screen.getByRole('button', { name: 'Status is On sale' })
    )
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    await userEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    chipElement('status')!.focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
  })

  it('keeps the remove button outside the select button', () => {
    render(<Harness initialChips={[status]} onSelectChip={() => {}} />)
    const select = screen.getByRole('button', { name: 'Status is On sale' })
    const remove = screen.getByRole('button', {
      name: 'Remove Status is On sale'
    })
    expect(select.contains(remove)).toBe(false)
    expect(chipElement('status')).not.toHaveAttribute('role')
    expect(chipElement('status')).not.toHaveAttribute('aria-label')
  })

  it('tells screen readers a locked chip is set by the page', () => {
    render(<Harness initialChips={[scope]} />)
    expect(chipElement('event')).toHaveTextContent(
      'Event is Lampshade Disco, set by this page'
    )
  })

  it('describes the input with the pending chip, alongside Field help', () => {
    render(
      <Field>
        <Field.Label>Find orders</Field.Label>
        <QueryField
          suggest={suggestFor}
          pendingChip={{ id: 'venue', label: 'Venue is' }}
        />
        <Field.HelperText>Search by name</Field.HelperText>
      </Field>
    )
    expect(
      screen.getByRole('combobox', { name: 'Find orders' })
    ).toHaveAccessibleDescription('Search by name Venue is')
  })

  it('does nothing to chips or text while disabled', async () => {
    const onSelectChip = vi.fn()
    render(
      <Harness
        disabled
        focusShortcut='/'
        defaultInputValue='lampshade'
        initialChips={[status]}
        onSelectChip={onSelectChip}
      />
    )
    expect(
      screen.queryByRole('button', { name: 'Clear' })
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Status is On sale' })
    )
    chipElement('status')!.focus()
    await userEvent.keyboard('{Enter}{Backspace}')
    expect(onSelectChip).not.toHaveBeenCalled()
    expect(chipNames()).toEqual(['Status is On sale'])
    document.body.focus()
    const slash = new KeyboardEvent('keydown', { key: '/', cancelable: true })
    document.dispatchEvent(slash)
    expect(slash.defaultPrevented).toBe(false)
  })

  it('searches the free text after arrowing to the search row', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'igua' })
    )
  })

  it('takes the suggestion the pointer rests on, where the Enter hint moves', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await userEvent.hover(
      await screen.findByRole('option', { name: /Venue is Iguana Teapot Hall/ })
    )
    expect(hinted()).toEqual(['Venue is Iguana Teapot Hall'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(iguana)
  })

  it('never lets Enter take a value under the pointer after a click', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [iguana, order] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: /Venue/ }))
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(order)
  })

  it('ignores an exact match found for older text', async () => {
    const onAccept = vi.fn()
    const later = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <Harness
        onAccept={onAccept}
        suggest={(text) =>
          text === '1042x' ? later.promise : suggestFor(text)
        }
      />
    )
    await typeInto('1042')
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('x{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: '1042x' })
    )
  })

  it('leaves Enter alone while composing or with a modifier', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}')
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 })
    expect(onAccept).not.toHaveBeenCalled()
    const modified = fireEvent.keyDown(input(), { key: 'Enter', metaKey: true })
    expect(onAccept).not.toHaveBeenCalled()
    expect(modified).toBe(false)
  })

  it('takes the first suggestion after opening with ArrowDown', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(venueField)
  })

  it('takes an arrowed suggestion after an earlier pointer highlight', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.click(input())
    await userEvent.hover(await screen.findByRole('option', { name: /Venue/ }))
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(venueField)
  })

  it('hands the highlight back to the row Enter takes once the pointer leaves the list', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    const filter = await screen.findByRole('option', {
      name: /Venue is Iguana Teapot Hall/
    })
    await userEvent.hover(filter)
    await userEvent.unhover(filter)
    await waitFor(() => expect(hinted()).toEqual(['Search for “igua”']))
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: /^Search for/ }).id
    )
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search' })
    )
  })

  it('moves the highlight from an arrowed row to the one the pointer rests on', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.hover(screen.getByRole('option', { name: /^Venue$/ }))
    expect(hinted()).toEqual(['Venue'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(venueField)
  })

  it('starts the value step with no value as Enter target', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [iguana] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is Iguana Teapot Hall'])
    )
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('drops the arrowed value when the value step is cancelled', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(true)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          onPendingChipCancel={() => setPending(false)}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [iguana] }]
              : suggestFor(text)
          }
          onAccept={onAccept}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is Iguana Teapot Hall'])
    )
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('keeps an arrowed field out of Enter after the value step is cancelled', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          onPendingChipCancel={() => setPending(false)}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [iguana] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is Iguana Teapot Hall'])
    )
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('keeps its own rows apart from suggestions that reuse their ids', async () => {
    const clash: QueryFieldSuggestion = {
      id: 'search',
      label: 'Search venues',
      kind: 'field',
      value: 'venue'
    }
    const onAccept = vi.fn()
    render(
      <Harness
        onAccept={onAccept}
        suggest={() => [{ id: 'search', label: 'Fields', items: [clash] }]}
      />
    )
    await typeInto('igua')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Search for “igua”', 'Search venues'])
    )
    expect(hinted()).toEqual(['Search for “igua”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'igua' })
    )
  })

  it("shows no earlier step's suggestions while the value step loads", async () => {
    const values = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    const { rerender } = render(<Harness />)
    await userEvent.click(input())
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    rerender(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        suggest={() => values.promise}
      />
    )
    await waitFor(() => expect(optionNames()).toEqual([]))
    expect(screen.getByText('Loading suggestions')).toBeInTheDocument()
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
    await act(async () =>
      values.resolve([{ id: 'values', label: 'Venue is', items: [iguana] }])
    )
    expect(optionNames()).toEqual(['Venue is Iguana Teapot Hall'])
  })

  it('offers no removal when chips cannot be removed', async () => {
    render(
      <QueryField
        aria-label='Search orders'
        chips={[status]}
        suggest={suggestFor}
      />
    )
    expect(
      screen.queryByRole('button', { name: 'Remove Status is On sale' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear' })
    ).not.toBeInTheDocument()
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toBe(input())
  })

  it('says it is loading while the first suggestions are on their way', async () => {
    const first = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(<Harness suggest={() => first.promise} />)
    await userEvent.click(input())
    expect(await screen.findByText('Loading suggestions')).toBeInTheDocument()
    await act(async () => first.resolve(suggestFor('')))
    expect(optionNames()).toEqual(['Venue'])
    expect(screen.queryByText('Loading suggestions')).not.toBeInTheDocument()
  })

  it('says it is loading for a later request, and settles on a failure', async () => {
    const later = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        suggest={(text) =>
          text
            ? later.promise
            : Promise.resolve<QueryFieldSuggestionGroup[]>([])
        }
      />
    )
    await userEvent.click(input())
    await userEvent.keyboard('z')
    expect(await screen.findByText('Loading suggestions')).toBeInTheDocument()
    await act(async () => later.reject(new Error('offline')))
    expect(screen.getByText('No suggestions')).toBeInTheDocument()
  })

  it('opens no list with nothing to suggest, hint, or text', async () => {
    render(<Harness initialChips={[scope]} suggest={() => []} />)
    await userEvent.click(input())
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
    await userEvent.keyboard('z')
    expect(
      await screen.findByRole('option', { name: 'Search for “z”' })
    ).toBeInTheDocument()
    await userEvent.keyboard('{Backspace}')
    await waitFor(() =>
      expect(input()).toHaveAttribute('aria-expanded', 'false')
    )
  })

  it('drops the arrow mark when newer results replace the arrowed one', async () => {
    const onAccept = vi.fn()
    const newer = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <Harness
        onAccept={onAccept}
        suggest={(text) => (text === 'ig' ? newer.promise : suggestFor(text))}
      />
    )
    await typeInto('i')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('g{ArrowDown}')
    await waitFor(() =>
      expect(hinted()).toEqual(['Venue is Iguana Teapot Hall'])
    )
    await act(async () =>
      newer.resolve([
        { id: 'orders', label: 'Orders', items: [{ ...order, exact: false }] }
      ])
    )
    expect(hinted()).toEqual(['Search for “ig”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'ig' })
    )
  })

  it('shows a description of 0', async () => {
    render(
      <Harness
        suggest={() => [
          {
            id: 'orders',
            label: 'Orders',
            items: [{ ...order, exact: false, description: 0 }]
          }
        ]}
      />
    )
    await userEvent.click(input())
    const option = await screen.findByRole('option', { name: /Order 1042/ })
    expect(
      option.querySelector('[data-slot=query-field-option-description]')
    ).toHaveTextContent('0')
  })

  it('tells assistive technology Enter selects a chip', () => {
    render(<Harness initialChips={[scope, status]} onSelectChip={() => {}} />)
    expect(chipElement('status')).toHaveAttribute('aria-keyshortcuts', 'Enter')
    expect(chipElement('event')).not.toHaveAttribute('aria-keyshortcuts')
  })

  it('keeps recent items out of the value step', async () => {
    render(
      <Harness
        recent={[iguana]}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
      />
    )
    await userEvent.click(input())
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
  })

  it('hands its input to inputRef', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<Harness inputRef={inputRef} />)
    expect(inputRef.current).toBe(input())
  })

  it('leaves form validity to the app', () => {
    render(<Harness required />)
    expect(input()).toHaveAttribute('aria-required', 'true')
    expect(document.querySelector('input[required]')).toBeNull()
  })

  it('clears text and unlocked chips, never locked ones', async () => {
    const onInputValueChange = vi.fn()
    render(
      <Harness
        initialChips={[scope, status, city]}
        defaultInputValue='lampshade'
        onInputValueChange={onInputValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(chipNames()).toEqual(['Event is Lampshade Disco'])
    expect(input()).toHaveValue('')
    expect(onInputValueChange).toHaveBeenLastCalledWith('')
    expect(
      screen.queryByRole('button', { name: 'Clear' })
    ).not.toBeInTheDocument()
  })

  it('hands Clear to onClear when given, text and chips together', async () => {
    const onClear = vi.fn()
    const onRemoveChip = vi.fn()
    const onInputValueChange = vi.fn()
    render(
      <QueryField
        aria-label='Search orders'
        chips={[scope, status]}
        suggest={suggestFor}
        onClear={onClear}
        onRemoveChip={onRemoveChip}
        defaultInputValue='igua'
        onInputValueChange={onInputValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onRemoveChip).not.toHaveBeenCalled()
    expect(onInputValueChange).not.toHaveBeenCalled()
    expect(input()).toHaveValue('')
  })

  it('focuses on its focus shortcut, unless another field has focus', async () => {
    render(
      <>
        <input aria-label='Other' />
        <Harness focusShortcut='/' />
      </>
    )
    expect(input()).toHaveAttribute('aria-keyshortcuts', '/')
    await userEvent.keyboard('/')
    expect(document.activeElement).toBe(input())
    expect(input()).toHaveValue('')
    await userEvent.click(screen.getByRole('textbox', { name: 'Other' }))
    await userEvent.keyboard('/')
    expect(screen.getByRole('textbox', { name: 'Other' })).toHaveValue('/')
  })

  it('shows the shortcut hint only while empty', async () => {
    render(<Harness focusShortcut='/' />)
    expect(
      document.querySelector('[data-slot=query-field-shortcut]')
    ).toHaveTextContent('/')
    await typeInto('n')
    expect(
      document.querySelector('[data-slot=query-field-shortcut]')
    ).not.toBeInTheDocument()
  })

  it('ignores suggestions that arrive after newer ones', async () => {
    const slow = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    const suggest = vi.fn((text: string) =>
      text === 'i' ? slow.promise : suggestFor(text)
    )
    render(<Harness suggest={suggest} />)
    await typeInto('ig')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await act(async () =>
      slow.resolve([{ id: 'stale', label: 'Stale', items: [order] }])
    )
    expect(optionNames()).not.toContain('Order 1042')
  })

  it('leaves the words a suggestion did not read in the field', async () => {
    const melbourne: QueryFieldSuggestion = {
      id: 'city:melbourne',
      label: 'City is Melbourne',
      kind: 'filter',
      value: 'melbourne',
      remainder: 'this weekend'
    }
    const onAccept = vi.fn()
    const onInputValueChange = vi.fn()
    render(
      <Harness
        onAccept={onAccept}
        onInputValueChange={onInputValueChange}
        suggest={() => [
          { id: 'filters', label: 'Filters', items: [melbourne] }
        ]}
      />
    )
    await typeInto('melb this weekend')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenCalledWith(melbourne)
    expect(input()).toHaveValue('this weekend')
    expect(onInputValueChange).toHaveBeenLastCalledWith('this weekend')
    // Open, so the words left over list their own suggestions.
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })

  it('highlights the search once a take leaves words in the field, never saying the list is empty', async () => {
    const sydney: QueryFieldSuggestion = {
      id: 'city:sydney',
      label: 'City is Sydney',
      kind: 'filter',
      value: 'sydney',
      remainder: 'this weekend'
    }
    const weekend: QueryFieldSuggestion = {
      id: 'starts:weekend',
      label: 'Starts is this weekend',
      kind: 'filter',
      value: 'weekend'
    }
    render(
      <Harness
        suggest={(text) => [
          {
            id: 'filters',
            label: 'Filters',
            items: text.startsWith('syd') ? [venueField, sydney] : [weekend]
          }
        ]}
      />
    )
    await typeInto('syd this weekend')
    await screen.findByRole('option', { name: sydney.label })
    // Text that went in and out again, as a live region may still read it.
    const shown: string[] = []
    const collect = (records: MutationRecord[]) => {
      for (const record of records) {
        shown.push(record.oldValue ?? '')
        for (const node of record.addedNodes) shown.push(node.textContent ?? '')
      }
    }
    const observer = new MutationObserver(collect)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true
    })
    onTestFinished(() => observer.disconnect())
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(input()).toHaveValue('this weekend')
    await screen.findByRole('option', { name: weekend.label })
    collect(observer.takeRecords())
    expect(shown.filter((text) => text.includes('No suggestions'))).toEqual([])
    const search = screen.getByRole('option', { name: /^Search for/ })
    await waitFor(() =>
      expect(input()).toHaveAttribute('aria-activedescendant', search.id)
    )
    expect(hinted()).toEqual(['Search for “this weekend”'])
    await userEvent.keyboard('{ArrowDown}')
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: weekend.label }).id
    )
  })

  it('clears the text on Escape once the list is closed, keeping chips', async () => {
    render(<Harness initialChips={[scope, status]} />)
    await typeInto('igua')
    await userEvent.keyboard('{Escape}')
    expect(input()).toHaveValue('igua')
    await userEvent.keyboard('{Escape}')
    expect(input()).toHaveValue('')
    expect(chipNames()).toHaveLength(2)
  })

  it('describes a chip to screen readers', () => {
    render(
      <Harness
        initialChips={[
          {
            id: 'starts',
            label: 'Starts is this weekend',
            description: '3 to 4 Oct'
          },
          { ...scope, description: 'Fri 9 Oct' }
        ]}
      />
    )
    expect(chipElement('starts')).toHaveTextContent(
      'Starts is this weekend, 3 to 4 Oct'
    )
    expect(chipElement('event')).toHaveTextContent(
      'Event is Lampshade Disco, set by this page, Fri 9 Oct'
    )
  })

  it('shows one Enter hint when a recent item repeats a suggestion', async () => {
    render(
      <Harness
        recent={[iguana]}
        suggest={() => [{ id: 'filters', label: 'Filters', items: [iguana] }]}
      />
    )
    await userEvent.click(input())
    await waitFor(() => expect(optionNames()).toHaveLength(2))
    await userEvent.keyboard('{ArrowDown}')
    expect(hinted()).toEqual(['Venue is Iguana Teapot Hall'])
    expect(
      screen.getAllByRole('option').filter((o) => o.querySelector('kbd'))
    ).toHaveLength(1)
  })

  it('drops the arrow mark when typing changes the text', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('igua')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}n{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'iguan' })
    )
  })

  it('attaches an inline inputRef once', () => {
    const inputRef = vi.fn()
    const { rerender } = render(<Harness inputRef={(node) => inputRef(node)} />)
    rerender(<Harness inputRef={(node) => inputRef(node)} />)
    rerender(<Harness inputRef={(node) => inputRef(node)} />)
    expect(inputRef.mock.calls).toEqual([[input()]])
  })

  it('gives a shared shortcut to the first field only', async () => {
    render(
      <>
        <QueryField aria-label='First' focusShortcut='/' suggest={() => []} />
        <QueryField aria-label='Second' focusShortcut='/' suggest={() => []} />
      </>
    )
    const first = screen.getByRole('combobox', { name: 'First' })
    const second = screen.getByRole('combobox', { name: 'Second' })
    expect(first).toHaveAttribute('aria-keyshortcuts', '/')
    expect(second).not.toHaveAttribute('aria-keyshortcuts')
    expect(
      document.querySelectorAll('[data-slot=query-field-shortcut]')
    ).toHaveLength(1)
    await userEvent.keyboard('/')
    expect(first).toHaveFocus()
  })

  it('keeps the Escapes it uses from the page', async () => {
    const outside = vi.fn()
    render(
      <div onKeyDown={(event) => outside(event.defaultPrevented)}>
        <Harness />
      </div>
    )
    await typeInto('igua')
    await userEvent.keyboard('{Escape}{Escape}')
    expect(input()).toHaveValue('')
    expect(outside).toHaveBeenLastCalledWith(true)
  })

  it('leaves the value step alone while composing, and ends it on Clear', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        initialChips={[status]}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    fireEvent.keyDown(input(), { key: 'Escape', isComposing: true })
    expect(onPendingChipCancel).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onPendingChipCancel).toHaveBeenCalledOnce()
  })

  it('keeps an Escape that ends a composition from the page', () => {
    const outside = vi.fn()
    render(
      <div onKeyDown={outside}>
        <Harness />
      </div>
    )
    fireEvent.keyDown(input(), { key: 'Escape', isComposing: true })
    expect(outside).not.toHaveBeenCalled()
  })

  it('offers Clear to end a value step on an otherwise empty field', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onPendingChipCancel).toHaveBeenCalledOnce()
  })

  it('shows a suggestion’s icon before its label, hidden from assistive technology', async () => {
    const pin = <svg data-testid='venue-icon' />
    const withIcon = { ...venueField, icon: pin }
    render(
      <Harness
        initialChips={[city]}
        recent={[{ ...iguana, icon: <svg data-testid='recent-icon' /> }]}
        suggest={() => [
          { id: 'fields', label: 'Filter by', items: [withIcon] }
        ]}
      />
    )
    await userEvent.click(input())
    const option = await screen.findByRole('option', { name: 'Venue' })
    const icon = within(option).getByTestId('venue-icon')
    const label = option.querySelector('[data-slot=query-field-option-label]')!
    expect(
      icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(icon.closest('[aria-hidden=true]')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('option', { name: 'Venue is Iguana Teapot Hall' })
      ).getByTestId('recent-icon')
    ).toBeInTheDocument()
    // Only the remove button's.
    expect(chipElement('city')!.querySelectorAll('svg')).toHaveLength(1)
  })

  it('marks the free-text search row with an icon', async () => {
    render(<Harness />)
    await typeInto('igua')
    const search = await screen.findByRole('option', {
      name: 'Search for “igua”'
    })
    const icon = search.querySelector('svg')!
    expect(
      icon.compareDocumentPosition(
        search.querySelector('[data-slot=query-field-option-label]')!
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(icon.closest('[aria-hidden=true]')).toBeInTheDocument()
  })
})

const operators = [
  { value: 'is', label: 'is' },
  { value: 'is-not', label: 'is not' },
  { value: 'has-all', label: 'has all of' }
]

function OperatorStep(props: HarnessProps) {
  const [operator, setOperator] = useState('is')
  const label = operators.find((each) => each.value === operator)!.label
  return (
    <Harness
      pendingChip={{
        id: 'venue',
        label: `Venue ${label}`,
        operators,
        operator
      }}
      onPendingOperatorChange={setOperator}
      suggest={() => [{ id: 'values', label: 'Venue', items: [iguana] }]}
      {...props}
    />
  )
}

const operatorGroup = () => screen.queryByRole('group', { name: 'Operator' })
// Found, not queried: on a slow runner the group renders a tick after a keyboard step.
const findOperatorGroup = () => screen.findByRole('group', { name: 'Operator' })
const pressed = async () =>
  within(await findOperatorGroup())
    .getAllByRole('button')
    .filter((item) => item.getAttribute('aria-pressed') === 'true')
    .map((item) => item.textContent)

describe('QueryField operators', () => {
  it('shows two or more operators above the values, pressing the current one', async () => {
    render(<OperatorStep />)
    await userEvent.click(input())
    const listbox = await screen.findByRole('listbox')
    expect(
      within(await findOperatorGroup())
        .getAllByRole('button')
        .map((item) => item.textContent)
    ).toEqual(['is', 'is not', 'has all of'])
    expect(await pressed()).toEqual(['is'])
    expect(
      (await findOperatorGroup()).compareDocumentPosition(listbox) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Venue' })).toBeInTheDocument()
  })

  // Such as an option field with no values to list, whose is empty is a click away.
  it('shows the operators while no value is listed and no hint is given', async () => {
    render(<OperatorStep suggest={() => []} />)
    await userEvent.click(input())
    await waitFor(() => expect(operatorGroup()).toBeInTheDocument())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows no operators with only one', async () => {
    render(
      <Harness
        pendingChip={{
          id: 'venue',
          label: 'Venue is',
          operators: operators.slice(0, 1),
          operator: 'is'
        }}
        suggest={() => [{ id: 'values', label: 'Venue', items: [iguana] }]}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: iguana.label })
    expect(operatorGroup()).toBeNull()
  })

  it('changes operator on a click, keeping focus in the input and the values open', async () => {
    render(<OperatorStep />)
    await userEvent.click(input())
    await screen.findByRole('listbox')
    await userEvent.click(screen.getByRole('button', { name: 'is not' }))
    expect(document.activeElement).toBe(input())
    expect(await pressed()).toEqual(['is not'])
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Venue is not')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('hands the clicked operator to onPendingOperatorChange', async () => {
    const onPendingOperatorChange = vi.fn()
    render(<OperatorStep onPendingOperatorChange={onPendingOperatorChange} />)
    await userEvent.click(input())
    await screen.findByRole('listbox')
    await userEvent.click(screen.getByRole('button', { name: 'has all of' }))
    expect(onPendingOperatorChange).toHaveBeenCalledWith('has-all')
  })

  it('walks the operators with Tab, then ends the step from the last', async () => {
    const onPendingChipCancel = vi.fn()
    render(<OperatorStep onPendingChipCancel={onPendingChipCancel} />)
    await userEvent.click(input())
    await screen.findByRole('listbox')
    expect(input()).toHaveAttribute('aria-keyshortcuts', 'Tab')
    await userEvent.tab()
    expect(await pressed()).toEqual(['is not'])
    expect(input()).toHaveAttribute('aria-keyshortcuts', 'Tab Shift+Tab')
    await userEvent.tab()
    expect(await pressed()).toEqual(['has all of'])
    expect(input()).toHaveAttribute('aria-keyshortcuts', 'Shift+Tab')
    expect(document.activeElement).toBe(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(onPendingChipCancel).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(await pressed()).toEqual(['has all of'])
    // Clear is in the field, so only the Tab itself ends the step.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Clear' })
    )
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
  })

  it('walks back with Shift+Tab, then leaves backwards from the first', async () => {
    render(
      <>
        <button type='button'>Before</button>
        <OperatorStep />
      </>
    )
    await userEvent.click(input())
    await screen.findByRole('listbox')
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab({ shift: true })
    expect(await pressed()).toEqual(['is not'])
    await userEvent.tab({ shift: true })
    expect(await pressed()).toEqual(['is'])
    expect(document.activeElement).toBe(input())
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Before' })
    )
    // The operators close with the list as focus leaves, so read the chip.
    expect(input()).toHaveAccessibleDescription('Venue is')
  })

  it('reads the new operator through the pending chip it describes the input with', async () => {
    render(<OperatorStep />)
    await userEvent.click(input())
    await userEvent.tab()
    expect(input()).toHaveAccessibleDescription('Venue is not')
  })

  it('leaves Tab to move on, ending the step, with no operators to cycle', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    expect(input()).not.toHaveAttribute('aria-keyshortcuts')
    await userEvent.tab()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Clear' })
    )
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
  })

  it('still leaves the value step with Escape and Backspace', async () => {
    const onPendingChipCancel = vi.fn()
    render(<OperatorStep onPendingChipCancel={onPendingChipCancel} />)
    await userEvent.click(input())
    await userEvent.tab()
    await userEvent.keyboard('{Escape}{Backspace}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(2)
  })

  it('asks for suggestions again when the operator changes', async () => {
    const suggest = vi.fn(() => [
      { id: 'values', label: 'Venue', items: [iguana] }
    ])
    render(<OperatorStep suggest={suggest} />)
    await userEvent.click(input())
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1))
    await userEvent.tab()
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(2))
  })
})

describe('QueryField value step hint', () => {
  it('shows the pending chip’s hint, announced, in place of No suggestions', async () => {
    render(
      <Harness
        pendingChip={{ id: 'sold', label: 'Sold is', hint: 'Type a number.' }}
        suggest={() => []}
      />
    )
    await userEvent.click(input())
    const hint = await screen.findByText('Type a number.')
    expect(hint).toHaveAttribute('role', 'status')
    expect(hint).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
  })

  it('shows the hint until a value is listed', async () => {
    render(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is', hint: 'Type a venue.' }}
        suggest={(text) => [
          { id: 'values', label: 'Venue', items: text ? [hall] : [] }
        ]}
      />
    )
    await userEvent.click(input())
    await screen.findByText('Type a venue.')
    await userEvent.keyboard('hal')
    await screen.findByRole('option', { name: hall.label })
    expect(screen.queryByText('Type a venue.')).not.toBeInTheDocument()
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
  })

  it('shows the hint below the values once typed text leaves Enter nothing', async () => {
    const perth: QueryFieldSuggestion = {
      id: 'perth',
      label: 'Perth',
      kind: 'filter',
      value: 'perth',
      selected: true
    }
    render(
      <Harness
        initialChips={[city]}
        pendingChip={{
          id: 'city',
          label: 'City is',
          chipId: 'city',
          hint: 'Perth is already in this filter.'
        }}
        suggest={() => [{ id: 'values', label: 'City', items: [perth] }]}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: 'Perth' })
    expect(
      screen.queryByText('Perth is already in this filter.')
    ).not.toBeInTheDocument()
    await userEvent.keyboard('per')
    expect(
      await screen.findByText('Perth is already in this filter.')
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Perth' })).toBeInTheDocument()
  })

  it('says it is loading, not the hint, while values load', async () => {
    const values = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <Harness
        pendingChip={{ id: 'sold', label: 'Sold is', hint: 'Type a number.' }}
        suggest={() => values.promise}
      />
    )
    await userEvent.click(input())
    expect(await screen.findByText('Loading suggestions')).toBeInTheDocument()
    expect(screen.queryByText('Type a number.')).not.toBeInTheDocument()
    await act(async () => values.resolve([]))
    expect(screen.getByText('Type a number.')).toBeInTheDocument()
  })
})

const hall: QueryFieldSuggestion = {
  id: 'venue:hall',
  label: 'Venue is Nimbus Thistle Hall',
  kind: 'filter',
  value: 'hall'
}

function TypedValueStep(props: HarnessProps) {
  return (
    <Harness
      pendingChip={{ id: 'venue', label: 'Venue is' }}
      suggest={() => [{ id: 'values', label: 'Venue', items: [hall, iguana] }]}
      {...props}
    />
  )
}

describe('QueryField value step Enter', () => {
  it('takes the first value the text matches on Enter', async () => {
    const onAccept = vi.fn()
    render(<TypedValueStep onAccept={onAccept} />)
    await typeInto('hal')
    await waitFor(() => expect(hinted()).toEqual([hall.label]))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(hall)
  })

  it('takes an exact match on Enter over the first value', async () => {
    const onAccept = vi.fn()
    const exactIguana = { ...iguana, exact: true }
    render(
      <TypedValueStep
        onAccept={onAccept}
        suggest={() => [
          { id: 'values', label: 'Venue', items: [hall, exactIguana] }
        ]}
      />
    )
    await typeInto('hal')
    await waitFor(() => expect(hinted()).toEqual([iguana.label]))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(exactIguana)
  })

  it('takes nothing on Enter before anything is typed', async () => {
    const onAccept = vi.fn()
    render(<TypedValueStep onAccept={onAccept} />)
    await userEvent.click(input())
    await screen.findByRole('option', { name: hall.label })
    expect(hinted()).toEqual([])
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('shows the rest of the highlighted value after the caret', async () => {
    const value = (label: string): QueryFieldSuggestion => ({
      id: label,
      label,
      kind: 'filter',
      value: label
    })
    render(
      <TypedValueStep
        suggest={() => [
          {
            id: 'values',
            label: 'State',
            items: [value('Ohio'), value('Oslo')]
          }
        ]}
      />
    )
    const ghost = () =>
      document.querySelector<HTMLElement>('[data-slot=query-field-ghost]')
        ?.dataset.ghost
    await typeInto('O')
    await waitFor(() => expect(ghost()).toBe('hio'))
    await userEvent.keyboard('{ArrowDown}')
    expect(ghost()).toBe('slo')
    await userEvent.keyboard('{ArrowUp}')
    expect(ghost()).toBe('hio')
  })

  it('goes back to the first value as typing changes the text after an arrow', async () => {
    const onAccept = vi.fn()
    render(<TypedValueStep onAccept={onAccept} />)
    await typeInto('h')
    await waitFor(() => expect(hinted()).toEqual([hall.label]))
    await userEvent.keyboard('{ArrowDown}')
    expect(hinted()).toEqual([iguana.label])
    await userEvent.keyboard('a')
    expect(hinted()).toEqual([hall.label])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(hall)
  })

  it('takes an arrowed row over the first value', async () => {
    const onAccept = vi.fn()
    render(<TypedValueStep onAccept={onAccept} />)
    await typeInto('hal')
    await screen.findByRole('option', { name: hall.label })
    // Enter already takes the top row, so Down lands on the next.
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(iguana)
  })

  it('takes an exact row on Enter before anything is typed', async () => {
    const onAccept = vi.fn()
    const empty: QueryFieldSuggestion = {
      id: 'venue:empty',
      label: 'Venue is empty',
      kind: 'filter',
      value: 'empty',
      exact: true
    }
    render(
      <TypedValueStep
        onAccept={onAccept}
        suggest={() => [{ id: 'values', label: 'Venue', items: [empty] }]}
      />
    )
    await userEvent.click(input())
    await waitFor(() => expect(hinted()).toEqual([empty.label]))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledExactlyOnceWith(empty)
  })

  it('takes no value found for older text', async () => {
    const onAccept = vi.fn()
    const later = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <TypedValueStep
        onAccept={onAccept}
        suggest={(text) =>
          text === 'halx'
            ? later.promise
            : [{ id: 'values', label: 'Venue', items: [hall] }]
        }
      />
    )
    await typeInto('hal')
    await waitFor(() => expect(hinted()).toEqual([hall.label]))
    await userEvent.keyboard('x{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })
})

describe('QueryField operators, edge keys', () => {
  it('leaves Tab to move on while the values are closed', async () => {
    const onPendingOperatorChange = vi.fn()
    render(
      <>
        <button type='button'>Before</button>
        <OperatorStep onPendingOperatorChange={onPendingOperatorChange} />
      </>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Before' }))
    await userEvent.tab()
    expect(document.activeElement).toBe(input())
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input()).not.toHaveAttribute('aria-keyshortcuts')
    await userEvent.tab()
    expect(onPendingOperatorChange).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Clear' })
    )
  })

  it('leaves a modified or composing Tab alone', async () => {
    const onPendingOperatorChange = vi.fn()
    const onPendingChipCancel = vi.fn()
    render(
      <OperatorStep
        onPendingOperatorChange={onPendingOperatorChange}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('listbox')
    for (const init of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
      { keyCode: 229 }
    ])
      fireEvent.keyDown(input(), { key: 'Tab', ...init })
    expect(onPendingOperatorChange).not.toHaveBeenCalled()
    expect(onPendingChipCancel).not.toHaveBeenCalled()
  })

  it('announces a change of operator', async () => {
    render(<OperatorStep />)
    await userEvent.click(input())
    const label = document.getElementById(
      input().getAttribute('aria-describedby')!.split(' ').at(-1)!
    )
    expect(label).toHaveAttribute('aria-live', 'polite')
  })

  it('takes nothing on Enter after an arrowed highlight is cycled away', async () => {
    const onAccept = vi.fn()
    render(<OperatorStep onAccept={onAccept} />)
    await userEvent.click(input())
    await screen.findByRole('option', { name: iguana.label })
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.tab()
    await screen.findByRole('option', { name: iguana.label })
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })
})

const perth: QueryFieldSuggestion = {
  id: 'perth',
  label: 'Perth',
  kind: 'filter',
  value: 'Perth'
}
const hobart: QueryFieldSuggestion = {
  id: 'hobart',
  label: 'Hobart',
  kind: 'filter',
  value: 'Hobart'
}

function CityEditing({
  onAccept,
  onPendingChipCancel,
  editing = true
}: Partial<QueryFieldProps> & { editing?: boolean }) {
  const [operator, setOperator] = useState('is')
  const [cities, setCities] = useState(['Perth'])
  const [chips, setChips] = useState<QueryFieldChip[]>([
    status,
    { id: 'city', label: 'City is Perth' }
  ])
  const chipsWith = (next: string[]) =>
    chips
      .filter((chip) => chip.id !== 'city')
      .concat(
        next.length
          ? [{ id: 'city', label: `City is ${next.join(' or ')}` }]
          : []
      )
  return (
    <QueryField
      aria-label='Search orders'
      chips={chips}
      onRemoveChip={(id) =>
        setChips((current) => current.filter((chip) => chip.id !== id))
      }
      pendingChip={{
        id: 'city',
        label: 'City is',
        chipId: editing ? 'city' : undefined,
        operators: [
          { value: 'is', label: 'is' },
          { value: 'is-not', label: 'is not' }
        ],
        operator
      }}
      onPendingOperatorChange={setOperator}
      onPendingChipCancel={onPendingChipCancel}
      suggest={(text) => [
        {
          id: 'values',
          label: 'City',
          items: [perth, hobart]
            .filter((item) =>
              item.label.toLowerCase().includes(text.trim().toLowerCase())
            )
            .map((item) => ({
              ...item,
              exact: item.label.toLowerCase() === text.trim().toLowerCase(),
              selected: editing && cities.includes(item.label)
            }))
        }
      ]}
      onAccept={(suggestion) => {
        onAccept?.(suggestion)
        const city = String(suggestion.value)
        const next = cities.includes(city)
          ? cities.filter((each) => each !== city)
          : [...cities, city]
        setCities(next)
        setChips(chipsWith(next))
      }}
    />
  )
}

const ticked = () =>
  screen
    .queryAllByRole('option', { selected: true })
    .map((option) => option.textContent)

describe('QueryField chip editing', () => {
  it('stands a pending chip in for the chip a step edits', () => {
    render(<CityEditing />)
    expect(chipElement('city')).toHaveAttribute('data-selected')
    expect(chipElement('status')).not.toHaveAttribute('data-selected')
    const pending = document.querySelector(
      '[data-slot=query-field-pending-chip]'
    )
    expect(pending).toHaveTextContent('City is')
    expect(pending).toContainElement(input())
    expect(input()).toHaveAccessibleDescription('City is')
  })

  it('ticks a selected suggestion, keeping the tick out of its name', async () => {
    render(<CityEditing />)
    await userEvent.click(input())
    const selected = await screen.findByRole('option', { name: 'Perth' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(
      selected.querySelector('[data-slot=combobox-item-indicator]')
    ).toBeInTheDocument()
    const other = screen.getByRole('option', { name: 'Hobart' })
    expect(other).toHaveAttribute('aria-selected', 'false')
    expect(
      other.querySelector('[data-slot=combobox-item-indicator]')
    ).toBeNull()
  })

  it('keeps the values open while editing a chip, ticking each one taken', async () => {
    const onAccept = vi.fn()
    render(<CityEditing onAccept={onAccept} />)
    await typeInto('hob')
    await userEvent.click(await screen.findByRole('option', { name: 'Hobart' }))
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'hobart' })
    )
    expect(input()).toHaveValue('')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(chipNames()).toContain('City is Perth or Hobart')
    await waitFor(() => expect(ticked()).toEqual(['Perth', 'Hobart']))
    await userEvent.click(screen.getByRole('option', { name: 'Perth' }))
    await waitFor(() => expect(ticked()).toEqual(['Hobart']))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('closes the values once a take ends the edit, as for a chip holding one value', async () => {
    function OneValue() {
      const [editing, setEditing] = useState(true)
      return (
        <Harness
          initialChips={[city]}
          pendingChip={
            editing
              ? { id: 'city', label: 'City is', chipId: 'city' }
              : undefined
          }
          suggest={() => [{ id: 'values', label: 'City', items: [hobart] }]}
          onAccept={() => setEditing(false)}
        />
      )
    }
    render(<OneValue />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: 'Hobart' }))
    expect(chipElement('city')).not.toHaveAttribute('data-selected')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  })

  it('closes the values once one is taken for a new filter', async () => {
    render(<CityEditing editing={false} />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: 'Hobart' }))
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  })

  it('removes the edited chip with Backspace on an empty field, ending the step', async () => {
    const onPendingChipCancel = vi.fn()
    render(<CityEditing onPendingChipCancel={onPendingChipCancel} />)
    await userEvent.click(input())
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toEqual(['Status is On sale'])
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input())
  })

  it('hands Backspace on an empty field to onPendingChipBackspace in place of removing the chip', async () => {
    const onPendingChipCancel = vi.fn()
    const onPendingChipBackspace = vi.fn()
    render(
      <Harness
        initialChips={[city]}
        pendingChip={{ id: 'city', label: 'City is', chipId: 'city' }}
        onPendingChipCancel={onPendingChipCancel}
        onPendingChipBackspace={onPendingChipBackspace}
      />
    )
    const kept = fireEvent.keyDown(input(), { key: 'Backspace' })
    expect(onPendingChipBackspace).toHaveBeenCalledTimes(1)
    expect(kept).toBe(false)
    expect(onPendingChipCancel).not.toHaveBeenCalled()
    expect(chipNames()).toEqual(['City is Perth'])
  })

  it('keeps a locked chip a step edits on Backspace, ending the step', async () => {
    const onRemoveChip = vi.fn()
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        initialChips={[scope, status]}
        onRemoveChip={onRemoveChip}
        pendingChip={{ id: 'event', label: 'Event is', chipId: 'event' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    await userEvent.keyboard('{Backspace}')
    expect(onRemoveChip).not.toHaveBeenCalled()
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
  })

  it('ends the step once focus leaves the field', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <>
        <CityEditing onPendingChipCancel={onPendingChipCancel} />
        <button type='button'>Outside</button>
      </>
    )
    await userEvent.click(input())
    await userEvent.click(screen.getByText('Outside'))
    await waitFor(() => expect(onPendingChipCancel).toHaveBeenCalledTimes(1))
    await userEvent.click(input())
    ;(await screen.findByRole('button', { name: 'is not' })).focus()
    await userEvent.click(screen.getByText('Outside'))
    await waitFor(() => expect(onPendingChipCancel).toHaveBeenCalledTimes(2))
  })

  // Focus is checked a moment after it moves, so the clock runs each check.
  const settleFocus = () => act(() => vi.runAllTimers())

  it('keeps the step while focus moves into the list or onto a chip, or the window blurs', async () => {
    const onPendingChipCancel = vi.fn()
    render(<CityEditing onPendingChipCancel={onPendingChipCancel} />)
    await userEvent.click(input())
    const toggle = await screen.findByRole('button', { name: 'is not' })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    toggle.focus()
    expect(screen.getByRole('listbox').parentElement).toContainElement(
      document.activeElement as HTMLElement
    )
    settleFocus()
    chipElement('status')!.focus()
    expect(document.activeElement).toBe(chipElement('status'))
    settleFocus()
    // As the window loses focus: the field blurs, but focus stays put.
    fireEvent.blur(chipElement('status')!)
    settleFocus()
    expect(onPendingChipCancel).not.toHaveBeenCalled()
  })

  it('ends a step for a new filter as focus leaves', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <>
        <CityEditing
          editing={false}
          onPendingChipCancel={onPendingChipCancel}
        />
        <button type='button'>Outside</button>
      </>
    )
    await userEvent.click(input())
    await userEvent.click(screen.getByText('Outside'))
    await waitFor(() => expect(onPendingChipCancel).toHaveBeenCalledTimes(1))
  })

  describe.each([
    ['a new filter', false],
    ['an edited chip', true]
  ])('a step for %s', (_, editing) => {
    function Step({ onCancel }: { onCancel: () => void }) {
      return (
        <>
          <CityEditing editing={editing} onPendingChipCancel={onCancel} />
          <button type='button'>Outside</button>
          <p>Elsewhere</p>
        </>
      )
    }

    it('ends as focus moves to something outside the field', async () => {
      const onCancel = vi.fn()
      render(<Step onCancel={onCancel} />)
      await userEvent.click(input())
      await screen.findByRole('listbox')
      act(() => screen.getByText('Outside').focus())
      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
    })

    // As an iPhone's keyboard is put away: the input blurs, and nothing takes focus.
    it('stays as the input blurs with nothing new focused', async () => {
      const onCancel = vi.fn()
      render(<Step onCancel={onCancel} />)
      await userEvent.click(input())
      await screen.findByRole('listbox')
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      onTestFinished(() => {
        vi.useRealTimers()
      })
      act(() => input().blur())
      expect(document.activeElement).toBe(document.body)
      settleFocus()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('ends as a press lands outside the field and its list', async () => {
      const onCancel = vi.fn()
      render(<Step onCancel={onCancel} />)
      await userEvent.click(input())
      await screen.findByRole('listbox')
      fireEvent.pointerDown(screen.getByText('Elsewhere'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('stays as a press lands in the list’s padding', async () => {
      const onCancel = vi.fn()
      render(<Step onCancel={onCancel} />)
      await userEvent.click(input())
      const popup = (await screen.findByRole('listbox')).closest(
        '[data-slot=combobox-popup]'
      )!
      fireEvent.pointerDown(popup)
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  it('ends a later step on a press outside while focus never left', async () => {
    const onPendingChipCancel = vi.fn()
    function Steps() {
      const [step, setStep] = useState(true)
      return (
        <>
          <Harness
            pendingChip={step ? { id: 'venue', label: 'Venue is' } : undefined}
            onPendingChipCancel={() => {
              setStep(false)
              onPendingChipCancel()
            }}
          />
          <p>Elsewhere</p>
          <button type='button' onClick={() => setStep(true)}>
            Start
          </button>
        </>
      )
    }
    render(<Steps />)
    await userEvent.click(input())
    fireEvent.pointerDown(screen.getByText('Elsewhere'))
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input())
    // A click alone, as a keyboard would pick the next field.
    fireEvent.click(screen.getByText('Start'))
    fireEvent.pointerDown(screen.getByText('Elsewhere'))
    expect(onPendingChipCancel).toHaveBeenCalledTimes(2)
  })

  it('leaves the step alone once the field unmounts as focus leaves', async () => {
    const onPendingChipCancel = vi.fn()
    const { rerender } = render(
      <CityEditing onPendingChipCancel={onPendingChipCancel} />
    )
    await userEvent.click(input())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    input().blur()
    rerender(<></>)
    settleFocus()
    expect(onPendingChipCancel).not.toHaveBeenCalled()
  })

  it('takes the first unticked value on Enter after typing, while editing a chip', async () => {
    const onAccept = vi.fn()
    render(<CityEditing onAccept={onAccept} />)
    await typeInto('perth')
    await screen.findByRole('option', { name: 'Perth' })
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
    expect(chipNames()).toContain('City is Perth')
    await userEvent.clear(input())
    await userEvent.keyboard('h')
    await screen.findByRole('option', { name: 'Hobart' })
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'hobart' })
    )
  })

  it('highlights no value once typed text leaves only ticked ones', async () => {
    const onAccept = vi.fn()
    render(<CityEditing onAccept={onAccept} />)
    await typeInto('r')
    await waitFor(() => expect(hinted()).toEqual(['Hobart']))
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Hobart' }).id
    )
    await userEvent.keyboard('th')
    await waitFor(() => expect(optionNames()).toEqual(['Perth']))
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('ends an edit on Enter with the text it started with, though Enter’s row is highlighted', async () => {
    const onAccept = vi.fn()
    const onPendingChipCancel = vi.fn()
    function Editing() {
      const [editing, setEditing] = useState(false)
      const [text, setText] = useState('')
      return (
        <Harness
          initialChips={[city]}
          onSelectChip={() => {
            setEditing(true)
            setText('Hobart')
          }}
          pendingChip={
            editing
              ? { id: 'city', label: 'City is', chipId: 'city' }
              : undefined
          }
          onPendingChipCancel={onPendingChipCancel}
          inputValue={text}
          onInputValueChange={setText}
          onAccept={onAccept}
          suggest={() => [{ id: 'values', label: 'City', items: [hobart] }]}
        />
      )
    }
    render(<Editing />)
    await userEvent.click(screen.getByRole('button', { name: 'City is Perth' }))
    await waitFor(() =>
      expect(input()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Hobart' }).id
      )
    )
    await userEvent.keyboard('{Enter}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('unticks an arrowed value on Enter, while editing a chip', async () => {
    const onAccept = vi.fn()
    render(<CityEditing onAccept={onAccept} />)
    await typeInto('perth')
    await screen.findByRole('option', { name: 'Perth' })
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'perth' })
    )
  })

  it('ends the edit on Enter with no new value to take, closing the values', async () => {
    const onAccept = vi.fn()
    const onPendingChipCancel = vi.fn()
    render(
      <CityEditing
        onAccept={onAccept}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: 'Perth' })
    await userEvent.keyboard('{Enter}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    await userEvent.keyboard('perth')
    await screen.findByRole('option', { name: 'Perth' })
    await userEvent.keyboard('{Enter}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    expect(onAccept).not.toHaveBeenCalled()
    expect(chipNames()).toEqual(['Status is On sale', 'City is Perth'])
  })

  it('keeps the edit on Enter while typed text matches no value, so its hint stays', async () => {
    const onPendingChipCancel = vi.fn()
    render(<CityEditing onPendingChipCancel={onPendingChipCancel} />)
    await typeInto('zzz')
    await waitFor(() => expect(optionNames()).toEqual([]))
    await userEvent.keyboard('{Enter}')
    expect(onPendingChipCancel).not.toHaveBeenCalled()
  })

  it('ends the edit on Enter in the empty field with no values to list', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <QueryField
        aria-label='Search orders'
        chips={[{ id: 'sold', label: 'Sold is more than 50' }]}
        pendingChip={{
          id: 'sold',
          label: 'Sold is more than',
          chipId: 'sold',
          hint: 'Type a number.'
        }}
        onPendingChipCancel={onPendingChipCancel}
        suggest={() => []}
      />
    )
    await userEvent.click(input())
    await screen.findByText('Type a number.')
    await userEvent.keyboard('{Enter}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the edit on Enter while the typed text’s values are on their way', async () => {
    const later = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    const onPendingChipCancel = vi.fn()
    render(
      <QueryField
        aria-label='Search orders'
        chips={[{ id: 'city', label: 'City is Perth' }]}
        pendingChip={{ id: 'city', label: 'City is', chipId: 'city' }}
        onPendingChipCancel={onPendingChipCancel}
        suggest={(text) =>
          text
            ? later.promise
            : [{ id: 'values', label: 'City', items: [perth, hobart] }]
        }
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: 'Hobart' })
    await userEvent.keyboard('zzz{Enter}')
    expect(onPendingChipCancel).not.toHaveBeenCalled()
  })

  it('keeps the edited chip on Escape, ending the step', async () => {
    const onPendingChipCancel = vi.fn()
    render(<CityEditing onPendingChipCancel={onPendingChipCancel} />)
    await userEvent.click(input())
    await userEvent.keyboard('{Escape}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(1)
    expect(chipNames()).toEqual(['Status is On sale', 'City is Perth'])
  })
})

function ContentStep({
  suggest = () => [],
  onPick = () => {}
}: {
  suggest?: QueryFieldProps['suggest']
  onPick?: (day: string) => void
}) {
  const [pending, setPending] = useState(true)
  return (
    <Harness
      pendingChip={
        pending
          ? {
              id: 'date',
              label: 'Date is',
              operators: [
                { value: 'on', label: 'is' },
                { value: 'before', label: 'is before' }
              ],
              operator: 'on',
              content: (
                <div aria-label='Days' role='group'>
                  <button type='button'>Next month</button>
                  <button
                    type='button'
                    onClick={() => {
                      onPick('22')
                      setPending(false)
                    }}
                  >
                    22
                  </button>
                </div>
              )
            }
          : undefined
      }
      onPendingChipCancel={() => setPending(false)}
      suggest={suggest}
    />
  )
}

const days = () => screen.queryByRole('group', { name: 'Days' })

describe('QueryField step content', () => {
  it('shows content under the operators and values, with no No suggestions', async () => {
    render(
      <ContentStep
        suggest={(text) =>
          text
            ? [{ id: 'values', label: 'Venue', items: [iguana] }]
            : [{ id: 'values', label: 'Venue', items: [] }]
        }
      />
    )
    await userEvent.click(input())
    await waitFor(() => expect(days()).toBeInTheDocument())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
    await userEvent.keyboard('i')
    const option = await screen.findByRole('option', { name: iguana.label })
    for (const before of [await findOperatorGroup(), option])
      expect(
        before.compareDocumentPosition(days()!) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
  })

  it('keeps focus in the input as the content is pressed', async () => {
    render(<ContentStep />)
    await userEvent.click(input())
    await userEvent.click(
      await screen.findByRole('button', { name: 'Next month' })
    )
    expect(input()).toHaveFocus()
    expect(days()).toBeInTheDocument()
    await userEvent.keyboard('2')
    expect(input()).toHaveValue('2')
  })

  it('closes the list once a press in the content ends the step', async () => {
    const onPick = vi.fn()
    render(<ContentStep onPick={onPick} />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('button', { name: '22' }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith('22')
    await waitFor(() =>
      expect(input()).toHaveAttribute('aria-expanded', 'false')
    )
    expect(days()).not.toBeInTheDocument()
    expect(input()).toHaveFocus()
  })

  it('shows no content once the step ends', async () => {
    render(<ContentStep />)
    await userEvent.click(input())
    await waitFor(() => expect(days()).toBeInTheDocument())
    await userEvent.keyboard('{Escape}')
    expect(days()).not.toBeInTheDocument()
  })
})
