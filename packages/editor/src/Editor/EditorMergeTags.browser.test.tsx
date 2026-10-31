import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const VARIABLES: EditorVariable[] = [
  { key: 'first_name', label: 'First name', tokens: { ae: '#FirstName#' } },
  { key: 'last_name', label: 'Last name', tokens: { ae: '#LastName#' } },
  { key: 'event_name', label: 'Event name', tokens: { ae: '#EventName#' } }
]

// `{{` is how the keyboard syntax types one `{`.
const OPEN = '{{{{'

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const tag = (key: string, fallback?: string): JSONContent => ({
  type: 'variable',
  attrs: fallback === undefined ? { key } : { key, fallback }
})

function renderEmail(props: Partial<React.ComponentProps<typeof Editor>> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      variables={VARIABLES}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

const mergeTagMenu = () => screen.findByRole('listbox', { name: 'Merge tags' })

const optionNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent)

// The menus portal to the body, so React unmounts them before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor merge tags', () => {
  it('lists the variables on {{, and inserts the chosen one', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard(`Hi ${OPEN}`)
    const listbox = await mergeTagMenu()
    expect(optionNames(listbox)).toEqual([
      'First name',
      'Last name',
      'Event name'
    ])
    expect(textbox).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hi ' }, tag('first_name')]
        })
      )
    )
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('filters by label or key as you type', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard(`${OPEN}event`)
    expect(optionNames(await mergeTagMenu())).toEqual(['Event name'])

    await userEvent.keyboard(
      '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}last_'
    )
    await waitFor(async () =>
      expect(optionNames(await mergeTagMenu())).toEqual(['Last name'])
    )
  })

  it('opens straight after a word, as {{ needs no space before it', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard(`Hey,${OPEN}first{Enter}`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hey,' }, tag('first_name')]
        })
      )
    )
  })

  it('leaves {{ as text without variables', async () => {
    renderEmail({ variables: undefined })
    const textbox = await focusedTextbox()

    await userEvent.keyboard(OPEN)

    // The menu opens in the transaction that types it, if at all.
    await waitFor(() => expect(textbox).toHaveTextContent('{{'))
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('inserts into a button’s label', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'button',
        attrs: { href: TICKETS },
        content: [{ type: 'text', text: 'See your tickets' }]
      })
    })
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(screen.getByText('See your tickets'))
    await userEvent.keyboard(`{End}, ${OPEN}first{Enter}`)

    await waitFor(() =>
      expect(onValueChange.mock.lastCall?.[0].doc.content[0]).toEqual({
        type: 'button',
        attrs: { href: TICKETS },
        content: [
          { type: 'text', text: 'See your tickets, ' },
          tag('first_name')
        ]
      })
    )
  })

  it('offers Merge tag in the / menu, which opens the merge tag list', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/merge')
    const insert = await screen.findByRole('listbox', { name: 'Insert' })
    expect(optionNames(insert)).toEqual(['Merge tag'])
    await userEvent.keyboard('{Enter}')

    expect(optionNames(await mergeTagMenu())).toHaveLength(3)
    await userEvent.keyboard('{ArrowDown}{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [tag('last_name')] })
      )
    )
  })

  it('offers no Merge tag in the / menu without variables', async () => {
    renderEmail({ variables: undefined })
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/merge')

    await waitFor(() => expect(textbox).toHaveTextContent('/merge'))
    expect(screen.queryByRole('listbox')).toBe(null)
  })
})

describe('Editor merge tag editing', () => {
  const greeting = email({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hi ' }, tag('first_name')]
  })

  async function selectChip() {
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await screen.findByText('First name'))
    return screen.findByRole('toolbar', { name: 'Merge tag actions' })
  }

  it('changes the variable and sets a fallback', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    const actions = await selectChip()

    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Merge tag' })
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Shows' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Last name' })
    )
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Fallback' }),
      'friend'
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hi ' }, tag('last_name', 'friend')]
        })
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
  })

  it('opens with the tag’s fallback, and clears it when emptied', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'paragraph',
        content: [tag('first_name', 'friend')]
      })
    })
    const actions = await selectChip()

    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    const fallback = await screen.findByRole('textbox', { name: 'Fallback' })
    expect(fallback).toHaveValue('friend')
    await userEvent.clear(fallback)
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [tag('first_name')] })
      )
    )
  })

  it('removes the tag', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    const actions = await selectChip()

    await userEvent.click(
      within(actions).getByRole('button', { name: 'Remove merge tag' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [{ type: 'text', text: 'Hi ' }] })
      )
    )
  })
})
