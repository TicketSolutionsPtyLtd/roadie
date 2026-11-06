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
import { MOD, selectParagraph } from './testUtils'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const VARIABLES: EditorVariable[] = [
  { key: 'first_name', label: 'First name', tokens: { ae: '#FirstName#' } },
  {
    key: 'unsubscribe_url',
    label: 'Unsubscribe page',
    kind: 'url',
    tokens: { ae: '#OptOut#' }
  },
  {
    key: 'view_url',
    label: 'View in browser',
    kind: 'url',
    tokens: { ae: '[ViewInBrowserLink]' }
  }
]

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const linked = (text: string, attrs: Record<string, unknown>) => ({
  type: 'paragraph',
  content: [{ type: 'text', text, marks: [{ type: 'link', attrs }] }]
})

const button = (attrs: Record<string, unknown>): JSONContent => ({
  type: 'button',
  attrs,
  content: [{ type: 'text', text: 'Unsubscribe' }]
})

function renderEmail(
  defaultValue?: EditorValue,
  variables: EditorVariable[] = VARIABLES
) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      variables={variables}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const firstBlock = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall?.[0].doc.content[0]

async function openLink(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await selectParagraph(within(textbox).getByText(text))
  await waitFor(() => expect(textbox).toHaveFocus())
  await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
  return screen.findByRole('dialog')
}

// The popovers portal to the body, so React unmounts them before it empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor email links to link variables', () => {
  it('links the selected text to the unsubscribe page', async () => {
    const onValueChange = renderEmail(
      email({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Unsubscribe' }]
      })
    )
    const dialog = await openLink('Unsubscribe')

    expect(
      within(dialog)
        .getAllByRole('button', { pressed: false })
        .map((item) => item.textContent)
    ).toEqual(['Unsubscribe page', 'View in browser'])
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Unsubscribe page' })
    )

    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('Unsubscribe', { variable: 'unsubscribe_url' })
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
  })

  it('inserts a link variable’s label at the caret, linked to it', async () => {
    const onValueChange = renderEmail()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'View in browser' })
    )

    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('View in browser', { variable: 'view_url' })
      )
    )
  })

  it('shows which variable a link links to, and swaps it for a web address', async () => {
    const onValueChange = renderEmail(
      email(linked('Unsubscribe', { variable: 'unsubscribe_url' }))
    )
    const dialog = await openLink('Unsubscribe')

    expect(
      within(dialog).getByRole('button', { name: 'Unsubscribe page' })
    ).toHaveAttribute('aria-pressed', 'true')
    const input = within(dialog).getByRole('textbox', { name: 'Link' })
    expect(input).toHaveValue('')
    await userEvent.fill(input, TICKETS)
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('Unsubscribe', { href: TICKETS })
      )
    )
  })

  it('keeps a typed address on Escape, and undo puts the variable back', async () => {
    const onValueChange = renderEmail(
      email(linked('Unsubscribe', { variable: 'unsubscribe_url' }))
    )
    const dialog = await openLink('Unsubscribe')
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Link' }),
      TICKETS
    )
    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('Unsubscribe', { href: TICKETS })
      )
    )

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(firstBlock(onValueChange)).toEqual(
      linked('Unsubscribe', { href: TICKETS })
    )
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('Unsubscribe', { variable: 'unsubscribe_url' })
      )
    )
  })

  it('undoes a variable picked after a typed address in one step', async () => {
    const onValueChange = renderEmail(
      email(linked('Unsubscribe', { href: TICKETS }))
    )
    const dialog = await openLink('Unsubscribe')
    const input = within(dialog).getByRole('textbox', { name: 'Link' })
    await userEvent.clear(input)
    await userEvent.type(input, 'oztix.com.au')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'View in browser' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(firstBlock(onValueChange)).toEqual(
      linked('Unsubscribe', { variable: 'view_url' })
    )

    // The second undo finds nothing earlier to take back.
    await userEvent.keyboard(`{${MOD}>}zz{/${MOD}}`)

    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        linked('Unsubscribe', { href: TICKETS })
      )
    )
  })

  it('offers no link variables without any', async () => {
    renderEmail(
      email({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Unsubscribe' }]
      }),
      VARIABLES.slice(0, 1)
    )
    const dialog = await openLink('Unsubscribe')

    expect(within(dialog).queryByText('Or link to')).toBe(null)
  })

  it('leaves link variables out of the merge tag list', async () => {
    renderEmail()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)
    await waitFor(() => expect(textbox).toHaveFocus())

    await userEvent.keyboard('{{{{')

    const listbox = await screen.findByRole('listbox', { name: 'Merge tags' })
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['First name'])
  })

  it('leaves link variables out of the merge tag form', async () => {
    renderEmail(
      email({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hi ' },
          { type: 'variable', attrs: { key: 'first_name' } }
        ]
      })
    )
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await screen.findByText('First name'))
    const actions = await screen.findByRole('toolbar', {
      name: 'Merge tag actions'
    })
    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Merge tag' })
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Shows' })
    )

    const listbox = await screen.findByRole('listbox')
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['First name'])
  })
})

describe('Editor email buttons that link to link variables', () => {
  async function openSettings() {
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await screen.findByText('Unsubscribe'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Button settings' })
    )
    return screen.findByRole('dialog', { name: 'Button settings' })
  }

  it('links a button to the unsubscribe page', async () => {
    const onValueChange = renderEmail(email(button({ href: TICKETS })))
    const dialog = await openSettings()

    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Links to' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Unsubscribe page' })
    )
    expect(within(dialog).queryByRole('textbox', { name: 'Link' })).toBe(null)

    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(
        button({ variable: 'unsubscribe_url' })
      )
    )
  })

  it('keeps a variable the editor no longer lists choosable', async () => {
    renderEmail(email(button({ variable: 'old_url' })))
    const dialog = await openSettings()

    const linksTo = within(dialog).getByRole('combobox', { name: 'Links to' })
    expect(linksTo.textContent).toBe('old_url')
    expect(within(dialog).queryByRole('textbox', { name: 'Link' })).toBe(null)
    await userEvent.click(linksTo)
    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toEqual([
      'A web address',
      'Unsubscribe page',
      'View in browser',
      'old_url'
    ])
  })

  it('keeps the variable until a button has a whole web address', async () => {
    const onValueChange = renderEmail(
      email(button({ variable: 'unsubscribe_url' }))
    )
    const dialog = await openSettings()

    expect(
      within(dialog).getByRole('combobox', { name: 'Links to' })
    ).toHaveTextContent('Unsubscribe page')
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Links to' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'A web address' })
    )
    const link = within(dialog).getByRole('textbox', { name: 'Link' })
    await userEvent.click(link)
    await userEvent.keyboard('{Enter}')
    expect(link).toHaveAttribute('aria-invalid', 'true')
    expect(
      firstBlock(onValueChange) ?? button({ variable: 'unsubscribe_url' })
    ).toEqual(button({ variable: 'unsubscribe_url' }))

    await userEvent.fill(link, TICKETS)
    await waitFor(() =>
      expect(firstBlock(onValueChange)).toEqual(button({ href: TICKETS }))
    )
  })
})
