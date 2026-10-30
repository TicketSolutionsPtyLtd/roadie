import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue, JSONContent } from '../schema'
import { LINE_END, MOD } from './testUtils'

const LABEL = 'Newsletter'

const p = (text?: string): JSONContent =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }

const button = (href: string, text = 'Button'): JSONContent => ({
  type: 'button',
  attrs: { href },
  content: [{ type: 'text', text }]
})

const columns = (...texts: string[][]): JSONContent => ({
  type: 'columns',
  content: texts.map((lines) => ({
    type: 'column',
    content: lines.map((line) => p(line))
  }))
})

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

function renderEmail(defaultValue?: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const saved = (onValueChange: ReturnType<typeof vi.fn>, value: EditorValue) =>
  waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(value))

async function clickText(text: string) {
  await userEvent.click(await screen.findByText(text))
}

async function insertButton() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  await userEvent.keyboard('/button')
  await screen.findByRole('option', { name: 'Button' })
  await userEvent.keyboard('{Enter}')
  return screen.findByRole('textbox', { name: 'Button link' })
}

async function choose(trigger: string | RegExp, option: string) {
  await userEvent.click(await screen.findByRole('button', { name: trigger }))
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: option })
  )
}

// The menus portal to the body, so React unmounts them before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor email blocks', () => {
  it('inserts a button with its label selected to type over', async () => {
    const onValueChange = renderEmail()
    const input = await insertButton()
    await waitFor(() => expect(input).toHaveFocus())

    await userEvent.keyboard('oztix.com.au/tickets{Enter}')
    await saved(
      onValueChange,
      email(button('https://oztix.com.au/tickets'), p())
    )

    await userEvent.keyboard('Buy tickets')
    await saved(
      onValueChange,
      email(button('https://oztix.com.au/tickets', 'Buy tickets'), p())
    )
  })

  it('keeps the link form under the caret as its container scrolls', async () => {
    render(
      <div data-testid='scroller' style={{ height: 300, overflowY: 'auto' }}>
        <Editor aria-label={LABEL} preset='email' />
        <div style={{ height: 1000 }} />
      </div>
    )
    await insertButton()
    const popup = () => document.querySelector('[data-slot="popover-popup"]')!
    await waitFor(() => expect(popup()).toBeInTheDocument())
    const before = popup().getBoundingClientRect().top

    screen.getByTestId('scroller').scrollTop = 100

    await waitFor(() =>
      expect(popup().getBoundingClientRect().top).toBeCloseTo(before - 100, 0)
    )
  })

  it.each(['/tickets', 'javascript:alert(1)'])(
    'refuses %s as a button link',
    async (href) => {
      const onValueChange = renderEmail()
      const input = await insertButton()

      await userEvent.type(input, `${href}{Enter}`)

      expect(
        await screen.findByText(/Enter a full web address/)
      ).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(JSON.stringify(onValueChange.mock.calls)).not.toContain(
        '"type":"button"'
      )
    }
  )

  it.each(['mailto:tickets@oztix.com.au', 'tel:+61730000000'])(
    'links a button to %s',
    async (href) => {
      const onValueChange = renderEmail()
      const input = await insertButton()

      await userEvent.type(input, `${href}{Enter}`)

      await saved(onValueChange, email(button(href), p()))
    }
  )

  it('leaves a button for a new paragraph on Enter', async () => {
    const onValueChange = renderEmail(
      email(button('https://oztix.com.au', 'Buy tickets'))
    )
    await clickText('Buy tickets')

    await userEvent.keyboard(`${LINE_END}{Enter}Doors 7pm`)

    await saved(
      onValueChange,
      email(button('https://oztix.com.au', 'Buy tickets'), p('Doors 7pm'), p())
    )
  })

  it('edits and removes a button from its toolbar', async () => {
    const onValueChange = renderEmail(
      email(button('https://oztix.com.au', 'Buy tickets'), p('Doors 7pm'))
    )
    await clickText('Buy tickets')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit link' })
    )
    const input = await screen.findByRole('textbox', { name: 'Button link' })
    expect(input).toHaveValue('https://oztix.com.au')
    await userEvent.fill(input, 'https://oztix.com.au/whats-on')
    await userEvent.keyboard('{Enter}')
    await saved(
      onValueChange,
      email(
        button('https://oztix.com.au/whats-on', 'Buy tickets'),
        p('Doors 7pm')
      )
    )

    await clickText('Buy tickets')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove button' })
    )
    await saved(onValueChange, email(p('Doors 7pm')))
  })

  it('adds an empty column from the columns menu', async () => {
    const onValueChange = renderEmail(
      email(columns(['Lineup'], ['Tickets']), p('Doors 7pm'))
    )
    await clickText('Lineup')

    await choose('Columns: 2 columns', '3 columns')
    await saved(
      onValueChange,
      email(columns(['Lineup'], ['Tickets'], ['']), p('Doors 7pm'))
    )
  })

  it('moves a removed column’s blocks into the one before, and undo restores it', async () => {
    const value = email(
      columns(['Lineup'], ['Tickets'], ['Getting there', 'Parking']),
      p('Doors 7pm')
    )
    const onValueChange = renderEmail(value)
    await clickText('Parking')

    await choose('Columns: 3 columns', '2 columns')
    await saved(
      onValueChange,
      email(
        columns(['Lineup'], ['Tickets', 'Getting there', 'Parking']),
        p('Doors 7pm')
      )
    )

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await saved(onValueChange, value)
  })

  it('keeps typing in its line when that line’s column is removed', async () => {
    const onValueChange = renderEmail(
      email(
        columns(['Lineup'], ['Tickets'], ['Getting there', 'Parking']),
        p('Doors 7pm')
      )
    )
    await clickText('Parking')
    await userEvent.keyboard(LINE_END)

    await choose('Columns: 3 columns', '2 columns')
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    await userEvent.keyboard(' on site')

    await saved(
      onValueChange,
      email(
        columns(['Lineup'], ['Tickets', 'Getting there', 'Parking on site']),
        p('Doors 7pm')
      )
    )
  })

  it.each([
    ['below a button', 'Buy tickets', 'Button actions', 'button', 'below'],
    ['above columns', 'Lineup', 'Columns actions', 'columns', 'above']
  ] as const)(
    'places the toolbar %s',
    async (_, text, toolbarName, type, side) => {
      renderEmail(
        email(
          p('Doors 7pm'),
          button('https://oztix.com.au', 'Buy tickets'),
          columns(['Lineup'], ['Tickets'])
        )
      )
      await clickText(text)

      const toolbar = await screen.findByRole('toolbar', { name: toolbarName })
      const node = document.querySelector(`[data-type="${type}"]`)!
      await waitFor(() => {
        const bar = toolbar.getBoundingClientRect()
        const box = node.getBoundingClientRect()
        expect(Math.round(bar.left)).toBe(Math.round(box.left))
        if (side === 'below') expect(bar.top).toBeGreaterThanOrEqual(box.bottom)
        else expect(bar.bottom).toBeLessThanOrEqual(box.top)
      })
    }
  )

  it('sets a selected spacer’s height', async () => {
    const onValueChange = renderEmail(
      email(p('Doors 7pm'), { type: 'spacer', attrs: { height: 40 } }, p())
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox.querySelector('[data-type="spacer"]')!)

    await choose('Height: 40px', 'Large (64px)')

    await saved(
      onValueChange,
      email(p('Doors 7pm'), { type: 'spacer', attrs: { height: 64 } }, p())
    )
    expect(
      await screen.findByRole('button', { name: 'Height: Large (64px)' })
    ).toBeInTheDocument()
  })
})
