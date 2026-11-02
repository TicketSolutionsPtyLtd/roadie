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

describe('Editor button settings', () => {
  it('opens with the button’s link and look, focused on the link', async () => {
    renderEmail(email(button({ emphasis: 'normal', align: 'center' })))
    const dialog = await openSettings()

    const link = within(dialog).getByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(link).toHaveFocus())
    expect(link).toHaveValue(TICKETS)
    const pressed = within(dialog)
      .getAllByRole('button', { pressed: true })
      .map((item) => item.textContent)
    expect(pressed).toEqual(['Outline', 'Fit label', 'Centre'])
  })

  it('saves an outline, right-aligned button, and draws it so', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Outline' })
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Right' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(
        button({ emphasis: 'normal', align: 'right' })
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
    const { left, right } = drawn().getBoundingClientRect()
    const column = columnBox(drawn())
    expect(right).toBeCloseTo(column.right, 0)
    expect(left).toBeGreaterThan(column.left)
  })

  it('spans the column at full width, which drops its alignment', async () => {
    const onValueChange = renderEmail(email(button({ align: 'center' })))
    const dialog = await openSettings()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Full width' })
    )
    expect(within(dialog).getByRole('group', { name: 'Align' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

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
      email(button({ emphasis: 'normal', fullWidth: true }))
    )
    const dialog = await openSettings()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Filled' })
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Fit label' })
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(savedButton(onValueChange)).toEqual(button()))
  })

  it('keeps the dialog open on a link an email can’t open', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()
    const link = within(dialog).getByRole('textbox', { name: 'Link' })

    await userEvent.fill(link, '/whats-on')
    await userEvent.keyboard('{Enter}')

    expect(link).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText(/Enter a full web address/)).toBeVisible()
    expect(link).toHaveFocus()
    expect(savedButton(onValueChange) ?? button()).toEqual(button())
  })

  it('leaves the button as it was on Cancel', async () => {
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Outline' })
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedButton(onValueChange) ?? button()).toEqual(button())
    expect(drawn()).toHaveClass('emphasis-strong')
  })
})
