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
  onTestFinished,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { MOD } from './testUtils'

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
  onValueChange.mock.lastCall?.[0].doc.content.find(
    (node: JSONContent) => node.type === 'button'
  )

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
  it('opens with the button’s link and look, focused on its emphasis', async () => {
    renderEmail(email(button({ emphasis: 'subtle', align: 'center' })))
    const dialog = await openSettings()

    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Subtle' })
      ).toHaveFocus()
    )
    const link = within(dialog).getByRole('textbox', { name: 'Link' })
    expect(link).toHaveValue(TICKETS)
    const pressed = within(dialog)
      .getAllByRole('button', { pressed: true })
      .map((item) => item.textContent)
    expect(pressed).toEqual(['Subtle', 'Fit label', 'Centre'])
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBe(null)
  })

  it('focuses the link of a section’s button, which has none yet, then its emphasis once linked', async () => {
    render(
      <Editor
        aria-label={LABEL}
        toolbar='docked'
        defaultValue={email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Doors 7pm' }]
        })}
      />
    )
    await userEvent.click(await screen.findByText('Doors 7pm'))
    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Blocks' }))
    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await userEvent.click(within(drawer).getByRole('button', { name: 'Event' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    const dialog = await openSettings()

    const link = within(dialog).getByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(link).toHaveFocus())

    await userEvent.type(link, 'oztix.com.au{Enter}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Button settings' })).toBe(
        null
      )
    )
    const reopened = await openSettings()
    await waitFor(() =>
      expect(
        within(reopened).getByRole('button', { name: 'Strong' })
      ).toHaveFocus()
    )
  })

  it('opens clear of the button', async () => {
    renderEmail(email(button()))
    const dialog = await openSettings()

    await waitFor(() =>
      expect(dialog.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        drawn().getBoundingClientRect().bottom
      )
    )
  })

  it('opens as a drawer from the bottom on a narrow screen, still putting the button back on Escape', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const onValueChange = renderEmail(email(button()))
    const dialog = await openSettings()

    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect(box.left).toBeLessThanOrEqual(1)
      expect(box.right).toBeGreaterThanOrEqual(389)
      expect(box.bottom).toBeCloseTo(window.innerHeight, 0)
    })
    await choose(dialog, 'Normal')
    await waitFor(() =>
      expect(savedButton(onValueChange)).toEqual(button({ emphasis: 'normal' }))
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(savedButton(onValueChange)).toEqual(button()))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Button settings' })).toBe(
        null
      )
    )
  })

  it('opens a half-height sheet on a phone, over an unblurred page, with the button scrolled above it', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const filler = Array.from({ length: 12 }, (_, index) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: `Set time ${index + 1}` }]
    }))
    renderEmail(email(...filler, button(), ...filler))
    const dialog = await openSettings()

    await waitFor(() => {
      const sheet = dialog.getBoundingClientRect()
      expect(sheet.height).toBeLessThanOrEqual(window.innerHeight / 2 + 1)
      expect(drawn().getBoundingClientRect().bottom).toBeLessThanOrEqual(
        sheet.top
      )
      expect(drawn().getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
    })
    const backdrop = document.querySelector('[data-slot="drawer-backdrop"]')!
    expect(getComputedStyle(backdrop).backdropFilter).toBe('none')
  })

  it('keeps a touch screen’s docked bar above the keyboard while the drawer is open', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      matchMedia(query.replaceAll('(pointer: coarse)', 'all'))
    )
    onTestFinished(() => {
      vi.restoreAllMocks()
    })
    renderEmail(email(button()))
    const dialog = await openSettings()
    const bar = screen.getByRole('toolbar', {
      name: 'Formatting',
      hidden: true
    })
    const viewport = window.visualViewport!

    await choose(dialog, 'Normal')
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)

    expect(bar.getBoundingClientRect().bottom).toBeCloseTo(
      viewport.offsetTop + viewport.height,
      0
    )
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

  it('centres a button in its column', async () => {
    renderEmail(email(button()))
    const dialog = await openSettings()

    await choose(dialog, 'Centre')

    await waitFor(() => {
      const { left, right } = drawn().getBoundingClientRect()
      const column = columnBox(drawn())
      expect(left - column.left).toBeGreaterThan(0)
      expect(left - column.left).toBeCloseTo(column.right - right, 0)
    })
  })

  it('draws a strong button in the accent', async () => {
    renderEmail(email(button({ emphasis: 'normal' })))
    const dialog = await openSettings()

    await choose(dialog, 'Strong')

    await waitFor(() => expect(drawn()).toHaveClass('emphasis-strong'))
    expect(drawn()).toHaveClass('intent-accent')
  })

  it.each([
    ['normal', 'borderTopColor'],
    ['subtle', 'backgroundColor']
  ] as const)(
    'draws a %s button in neutrals under another intent',
    async (emphasis, property) => {
      render(
        <div className='intent-danger'>
          <Editor
            aria-label={LABEL}
            defaultValue={email(button({ emphasis }))}
          />
        </div>
      )
      await screen.findByRole('textbox', { name: LABEL })
      const neutral = document.createElement('div')
      neutral.className = `emphasis-${emphasis}`
      document.body.append(neutral)
      const danger = document.createElement('div')
      danger.className = `intent-danger emphasis-${emphasis}`
      document.body.append(danger)

      const colour = (element: Element) => getComputedStyle(element)[property]
      // Else the two references can't tell a neutral button from a tinted one.
      expect(colour(danger)).not.toBe(colour(neutral))
      expect(colour(drawn())).toBe(colour(neutral))
    }
  )

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

    await waitFor(() => expect(link).toHaveAttribute('aria-invalid', 'true'))
    // The error fades in.
    await waitFor(() =>
      expect(within(dialog).getByText(/Enter a full web address/)).toBeVisible()
    )
    expect(link).toHaveFocus()
    expect(savedButton(onValueChange) ?? button()).toEqual(button())
  })

  it('says a link can’t open in an email once they leave the field', async () => {
    renderEmail(email(button()))
    const dialog = await openSettings()
    const link = within(dialog).getByRole('textbox', { name: 'Link' })

    await userEvent.fill(link, '/whats-on')
    expect(link).not.toHaveAttribute('aria-invalid', 'true')
    await userEvent.tab()

    await waitFor(() => expect(link).toHaveAttribute('aria-invalid', 'true'))
    expect(link).not.toHaveFocus()
  })

  async function restyle() {
    const dialog = await openSettings()
    await choose(dialog, 'Subtle')
    await choose(dialog, 'Full width')
    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Link' }),
      'oztix.com.au/whats-on'
    )
  }

  const restyled = button({
    href: 'https://oztix.com.au/whats-on',
    emphasis: 'subtle',
    fullWidth: true
  })

  it('puts the button back as it opened on Escape', async () => {
    const onValueChange = renderEmail(email(button()))
    await restyle()
    await waitFor(() => expect(savedButton(onValueChange)).toEqual(restyled))

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedButton(onValueChange)).toEqual(button())
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
  })

  it('keeps the changes on a click outside', async () => {
    const onValueChange = renderEmail(
      // Above the button, where the popover below it doesn't cover.
      email(
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'See you there' }]
        },
        button()
      )
    )
    await restyle()

    await userEvent.click(screen.getByText('See you there'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedButton(onValueChange)).toEqual(restyled)
  })

  it('undoes every change it made in one step, and redoes them in one', async () => {
    const onValueChange = renderEmail(email(button()))
    await restyle()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() => expect(savedButton(onValueChange)).toEqual(button()))

    await userEvent.keyboard(`{${MOD}>}{Shift>}z{/Shift}{/${MOD}}`)
    await waitFor(() => expect(savedButton(onValueChange)).toEqual(restyled))
  })
})
