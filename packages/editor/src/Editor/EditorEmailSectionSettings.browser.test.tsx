import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'

const LABEL = 'Email'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

const variables: EditorVariable[] = [
  {
    key: 'tickets_left',
    label: 'Tickets left',
    tokens: { liquid: '{{ tickets_left }}' }
  }
]

const section = (attrs?: Record<string, unknown>): JSONContent => ({
  type: 'section',
  ...(attrs && { attrs }),
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Gates 6pm' }] }
  ]
})

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

function renderEmail(value: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      variables={variables}
      defaultValue={value}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const savedSection = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content![0]!

async function openSettings() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.hover(within(textbox).getByText('Gates 6pm'))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Block actions' })
  )
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Select section' })
  )
  await waitFor(() =>
    expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent('Settings')
  )
  await userEvent.click(screen.getAllByRole('menuitem')[0]!)
  return screen.findByRole('dialog', { name: 'Section settings' })
}

const pressed = (drawer: HTMLElement, name: string) =>
  within(drawer).getByRole('button', { name })

describe('Editor email section settings', () => {
  it('opens on a section from its menu, plain, normally spaced, and shown to everyone', async () => {
    renderEmail(email(section()))

    const drawer = await openSettings()

    expect(pressed(drawer, 'Plain')).toHaveAttribute('aria-pressed', 'true')
    expect(pressed(drawer, 'Normal')).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(drawer).getByRole('combobox', { name: 'Show to' })
    ).toHaveTextContent('Everyone')
  })

  it('applies a look and spacing as they’re picked, and Escape puts them back', async () => {
    const onValueChange = renderEmail(email(section()))
    const drawer = await openSettings()

    await userEvent.click(pressed(drawer, 'Tint'))
    await userEvent.click(pressed(drawer, 'Roomy'))

    await waitFor(() =>
      expect(savedSection(onValueChange).attrs).toEqual({
        look: 'tint',
        spacing: 'roomy'
      })
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedSection(onValueChange).attrs).toBeUndefined()
  })

  it('shows a section only to those a rule picks, and badges it', async () => {
    const onValueChange = renderEmail(email(section()))
    const drawer = await openSettings()

    await userEvent.click(
      within(drawer).getByRole('combobox', { name: 'Show to' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Tickets left' })
    )
    await userEvent.click(
      within(drawer).getByRole('combobox', { name: 'When' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Is less than' })
    )
    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Value' }),
      '50'
    )

    await waitFor(() =>
      expect(savedSection(onValueChange).attrs).toEqual({
        showWhen: { key: 'tickets_left', op: 'lessThan', value: 50 }
      })
    )
    expect(await screen.findByText('Only when Tickets left < 50')).toBeVisible()
  })

  it('badges a section that loads with a rule, and takes it off for everyone', async () => {
    const onValueChange = renderEmail(
      email(section({ showWhen: { key: 'tickets_left', op: 'exists' } }))
    )

    expect(
      await screen.findByText('Only when Tickets left is set')
    ).toBeVisible()
    const drawer = await openSettings()
    await userEvent.click(
      within(drawer).getByRole('combobox', { name: 'Show to' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Everyone' })
    )
    await userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))

    await waitFor(() =>
      expect(screen.queryByText('Only when Tickets left is set')).toBe(null)
    )
    expect(savedSection(onValueChange).attrs).toBeUndefined()
  })
})
