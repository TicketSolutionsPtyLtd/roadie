import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

// Unstyled, a button has no width or alignment to measure.
let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const button = (attrs: Record<string, unknown> = {}): JSONContent => ({
  type: 'button',
  attrs: { href: TICKETS, ...attrs },
  content: [{ type: 'text', text: 'Get tickets' }]
})

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

function renderEmail(defaultValue: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

async function openSettings() {
  await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(await screen.findByText('Get tickets'))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Button settings' })
  )
  return screen.findByRole('dialog', { name: 'Button settings' })
}

const savedButton = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall?.[0].doc.content[0]

const drawn = () =>
  screen.getByText('Get tickets').closest<HTMLElement>('[data-type="button"]')!

// The popover portals to the body, so React unmounts it before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

// The box a block lays out in: its parent's, less the parent's padding.
function columnBox(block: HTMLElement) {
  const parent = block.parentElement!
  const { left, right } = parent.getBoundingClientRect()
  const { paddingLeft, paddingRight } = getComputedStyle(parent)
  return {
    left: left + parseFloat(paddingLeft),
    right: right - parseFloat(paddingRight)
  }
}

const choose = (dialog: HTMLElement, name: string) =>
  userEvent.click(within(dialog).getByRole('button', { name }))

describe('Editor button settings', () => {
  it('opens with the button’s link and look, focused on the link', async () => {
    renderEmail(email(button({ emphasis: 'subtle', align: 'center' })))
    const dialog = await openSettings()

    const link = within(dialog).getByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(link).toHaveFocus())
    expect(link).toHaveValue(TICKETS)
    const pressed = within(dialog)
      .getAllByRole('button', { pressed: true })
      .map((item) => item.textContent)
    expect(pressed).toEqual(['Subtle', 'Fit label', 'Centre'])
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBe(null)
  })

  it('applies each choice as it’s made, and draws it so', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()

    await choose(dialog, 'Normal')
    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(button({ emphasis: 'normal' }))
    )
    expect(drawn()).toHaveClass('emphasis-normal')

    await choose(dialog, 'Right')
    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(
        button({ emphasis: 'normal', align: 'right' })
      )
    )
    const { left, right } = drawn().getBoundingClientRect()
    const column = columnBox(drawn())
    expect(right).toBeCloseTo(column.right, 0)
    expect(left).toBeGreaterThan(column.left)
    expect(dialog).toBeVisible()
  })

  it('draws a strong button in the accent', async () => {
    renderEmail(email(button({ emphasis: 'normal' })))
    const dialog = await openSettings()

    await choose(dialog, 'Strong')

    await waitFor(() => expect(drawn()).toHaveClass('emphasis-strong'))
    expect(drawn()).toHaveClass('intent-accent')
  })

  it('spans the column at full width, which drops its alignment', async () => {
    const onValueChange = renderEmail(email(button({ align: 'center' })))
    const dialog = await openSettings()

    await choose(dialog, 'Full width')

    expect(within(dialog).getByRole('group', { name: 'Align' })).toBeDisabled()
    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(button({ fullWidth: true }))
    )
    const column = columnBox(drawn())
    expect(drawn().getBoundingClientRect().width).toBeCloseTo(
      column.right - column.left,
      0
    )
  })

  it('returns a button to the defaults, saving none of them', async () => {
    const onValueChange = renderEmail(
      email(button({ emphasis: 'subtle', fullWidth: true }))
    )
    const dialog = await openSettings()

    await choose(dialog, 'Strong')
    await choose(dialog, 'Fit label')

    await waitFor(() => expect(savedButton(onValueChange)).toEqual(button()))
  })

  it('applies a link once it’s a whole address', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()
    const link = within(dialog).getByRole('textbox', { name: 'Link' })

    await userEvent.fill(link, 'oztix.com.au/whats-on')

    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(
        button({ href: 'https://oztix.com.au/whats-on' })
      )
    )
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
  })

  it('keeps the last whole link, and says so, for one an email can’t open', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()
    const link = within(dialog).getByRole('textbox', { name: 'Link' })

    await userEvent.fill(link, '/whats-on')
    expect(link).not.toHaveAttribute('aria-invalid', 'true')
    await userEvent.keyboard('{Enter}')

    expect(link).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText(/Enter a full web address/)).toBeVisible()
    expect(link).toHaveFocus()
    expect(savedButton(onValueChange) ?? button()).toEqual(button())
  })

  it('keeps what was applied when Escape closes it', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()

    await choose(dialog, 'Subtle')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedButton(onValueChange)).toEqual(button({ emphasis: 'subtle' }))
  })
})
