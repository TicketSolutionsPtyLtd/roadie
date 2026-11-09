import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
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
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { apcaLc, shownFill, shownText } from './contrastTestUtils'
import { LINE_END, MOD, clickIntoEditor } from './testUtils'

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
  // A phone gets the block's sheet, of buttons, in place of its menu.
  const sheet = await waitFor(() => {
    const opened = screen.queryByRole('dialog')
    if (!opened) expect(screen.getByRole('menu')).toBeVisible()
    return opened
  })
  if (sheet) {
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Select section' })
    )
    await userEvent.click(
      await within(sheet).findByRole('button', { name: 'Settings' })
    )
  } else {
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Select section' })
    )
    await waitFor(() =>
      expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent('Settings')
    )
    await userEvent.click(screen.getAllByRole('menuitem')[0]!)
  }
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

  it('applies a look and spacing as they’re picked, and Escape keeps them', async () => {
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
    expect(savedSection(onValueChange).attrs).toEqual({
      look: 'tint',
      spacing: 'roomy'
    })
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

  it('shows who a section is for again after Undo in its settings', async () => {
    const onValueChange = renderEmail(email(section()))
    const drawer = await openSettings()
    const showTo = within(drawer).getByRole('combobox', { name: 'Show to' })
    await userEvent.click(showTo)
    await userEvent.click(
      await screen.findByRole('option', { name: 'Tickets left' })
    )
    await waitFor(() =>
      expect(savedSection(onValueChange).attrs).toEqual({
        showWhen: { key: 'tickets_left', op: 'exists' }
      })
    )

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(savedSection(onValueChange).attrs).toBeUndefined()
    )
    expect(showTo).toHaveTextContent('Everyone')
    expect(within(drawer).queryByRole('combobox', { name: 'When' })).toBe(null)
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
    // A click on the page keeps the change.
    await userEvent.click(document.body, { position: { x: 4, y: 4 } })

    await waitFor(() =>
      expect(screen.queryByText('Only when Tickets left is set')).toBe(null)
    )
    expect(savedSection(onValueChange).attrs).toBeUndefined()
  })

  it('opens Settings from the section’s own toolbar, with the caret in it', async () => {
    renderEmail(email(section()))
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('Gates 6pm'))

    await userEvent.click(
      await screen.findByRole('button', { name: 'Section settings' })
    )

    expect(
      await screen.findByRole('dialog', { name: 'Section settings' })
    ).toBeVisible()
  })

  it('warns of a rule naming a merge tag the email doesn’t list', async () => {
    renderEmail(email(section({ showWhen: { key: 'vip', op: 'exists' } })))

    expect(
      await screen.findByText('Only when vip is set · unknown merge tag')
    ).toBeVisible()
  })

  it('keeps a section’s settings open on a phone', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    renderEmail(email(section()))

    const drawer = await openSettings()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Tint' }))

    expect(
      screen.getByRole('dialog', { name: 'Section settings' })
    ).toBeVisible()
  })

  it('types into the section after its settings close on a phone, rather than replacing it', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const onValueChange = renderEmail(email(section()))
    const drawer = await openSettings()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Tint' }))

    await userEvent.click(document.body, { position: { x: 4, y: 4 } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await userEvent.keyboard('x')

    await waitFor(() =>
      expect(savedSection(onValueChange)).toEqual({
        ...section({ look: 'tint' }),
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'xGates 6pm' }]
          }
        ]
      })
    )
  })

  it('hides a section’s Settings while the caret is elsewhere', async () => {
    renderEmail(
      email(section(), {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Doors 7pm' }]
      })
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('Doors 7pm'))
    await userEvent.hover(document.body, { position: { x: 1, y: 1 } })

    await waitFor(() =>
      // Testing Library names no hidden element, so it's found by its label.
      expect(
        textbox.querySelector('[aria-label="Section settings"]')
      ).not.toBeVisible()
    )
    // Nor its floating surface, which would show as an empty pill.
    expect(
      textbox.querySelector('[data-slot="editor-section-toolbar"] > *')
    ).not.toBeVisible()
  })

  it('reads its toolbar in the dark', async () => {
    document.documentElement.classList.add('dark')
    onTestFinished(() => document.documentElement.classList.remove('dark'))
    renderEmail(
      email(section({ showWhen: { key: 'tickets_left', op: 'exists' } }))
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('Gates 6pm'))

    const badge = await screen.findByText('Only when Tickets left is set')
    const settings = await screen.findByRole('button', {
      name: 'Section settings'
    })

    expect(
      Math.abs(apcaLc(shownText(badge), shownFill(badge)))
    ).toBeGreaterThanOrEqual(60)
    expect(
      Math.abs(apcaLc(shownText(settings), shownFill(settings)))
    ).toBeGreaterThanOrEqual(45)
  })

  it('reads its toolbar in the dark on an email that sets its own text colour', async () => {
    document.documentElement.classList.add('dark')
    // As an email's theme sets it across its canvas.
    const theme = document.createElement('style')
    theme.textContent = '[data-email] { --intent-text-normal: #16202a; }'
    document.head.append(theme)
    onTestFinished(() => {
      document.documentElement.classList.remove('dark')
      theme.remove()
    })
    renderEmail(email(section()))
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('Gates 6pm'))

    const settings = await screen.findByRole('button', {
      name: 'Section settings'
    })

    expect(
      Math.abs(apcaLc(shownText(settings), shownFill(settings)))
    ).toBeGreaterThanOrEqual(45)
  })

  it('hides Settings before the editor has focus', async () => {
    renderEmail(email(section()))
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.hover(document.body, { position: { x: 1, y: 1 } })

    await waitFor(() =>
      expect(
        textbox.querySelector('[aria-label="Section settings"]')
      ).not.toBeVisible()
    )
  })

  it('takes a visit back in one step on Undo', async () => {
    const onValueChange = renderEmail(email(section()))
    const drawer = await openSettings()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Tint' }))
    await userEvent.click(within(drawer).getByRole('button', { name: 'Roomy' }))

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(savedSection(onValueChange).attrs).toBeUndefined()
    )
  })

  it.each([
    [
      'Done',
      async (drawer: HTMLElement) =>
        userEvent.click(within(drawer).getByRole('button', { name: 'Done' }))
    ],
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    [
      'a click away',
      async () => {
        await userEvent.click(document.body, { position: { x: 4, y: 4 } })
        // A click on the page leaves focus there in Firefox, so the author
        // comes back to the text, as Tab would bring them.
        screen.getByRole('textbox', { name: LABEL }).focus()
      }
    ]
  ])(
    'keeps the caret where it was after %s, outside the section, and the next key types there',
    async (_, close) => {
      const onValueChange = renderEmail(
        email(section({ showWhen: { key: 'tickets_left', op: 'exists' } }), {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Unsubscribe' }]
        })
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await clickIntoEditor(within(textbox).getByText('Unsubscribe'))
      await userEvent.keyboard(LINE_END)

      const drawer = await openSettings()
      await close(drawer)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
      await userEvent.keyboard('!')

      await waitFor(() =>
        expect(
          (onValueChange.mock.lastCall![0] as EditorValue).doc.content![1]
        ).toEqual({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Unsubscribe!' }]
        })
      )
    }
  )

  it('keeps the last section above its phone sheet', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    render(
      <div style={{ paddingTop: 900 }}>
        <Editor
          aria-label={LABEL}
          preset='email'
          variables={variables}
          defaultValue={email(section())}
        />
      </div>
    )

    const drawer = await openSettings()

    await waitFor(() => {
      const top = document
        .querySelector('[data-type="section"]')!
        .getBoundingClientRect().top
      expect(top).toBeGreaterThan(0)
      expect(top).toBeLessThan(drawer.getBoundingClientRect().top)
    })
  })

  it('keeps the email clear of the drawer on a wide page', async () => {
    await page.viewport(1280, 800)
    renderEmail(email(section()))

    const drawer = await openSettings()

    await waitFor(() =>
      expect(
        document.querySelector('[data-type="section"]')!.getBoundingClientRect()
          .right
      ).toBeLessThanOrEqual(drawer.getBoundingClientRect().left)
    )
  })

  it('keeps the editor’s own end padding as well as the room it makes', async () => {
    await page.viewport(1280, 800)
    render(
      <Editor
        aria-label={LABEL}
        preset='email'
        className='pe-8'
        variables={variables}
        defaultValue={email(section())}
      />
    )
    const root = (
      await screen.findByRole('textbox', { name: LABEL })
    ).closest<HTMLElement>('[data-slot="editor"]')!
    const drawer = await openSettings()

    // The editor's 32px, then the drawer's 16px gap.
    await waitFor(() => {
      const end =
        root.getBoundingClientRect().right -
        parseFloat(getComputedStyle(root).paddingRight)
      expect(end).toBeLessThanOrEqual(drawer.getBoundingClientRect().left - 47)
    })
  })

  it('gives up the room beside it below 1280px wide, and makes it again above', async () => {
    await page.viewport(1280, 800)
    onTestFinished(() => page.viewport(1280, 800))
    renderEmail(email(section()))
    const root = (
      await screen.findByRole('textbox', { name: LABEL })
    ).closest<HTMLElement>('[data-slot="editor"]')!
    const drawer = await openSettings()
    await waitFor(() => expect(root.style.paddingRight).not.toBe(''))

    // As it opens there, with no room made.
    await page.viewport(1100, 800)
    await waitFor(() => expect(root.style.paddingRight).toBe(''))

    await page.viewport(1280, 800)
    await waitFor(() =>
      expect(
        document.querySelector('[data-type="section"]')!.getBoundingClientRect()
          .right
      ).toBeLessThanOrEqual(drawer.getBoundingClientRect().left)
    )
  })

  it('brings the section above its phone sheet', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    render(
      <div style={{ height: 2400 }}>
        <div style={{ height: 900 }} />
        <Editor
          aria-label={LABEL}
          preset='email'
          variables={variables}
          defaultValue={email(section())}
        />
      </div>
    )

    const drawer = await openSettings()

    await waitFor(() => {
      const top = document
        .querySelector('[data-type="section"]')!
        .getBoundingClientRect().top
      expect(top).toBeGreaterThan(0)
      expect(top).toBeLessThan(drawer.getBoundingClientRect().top)
    })
  })
})
