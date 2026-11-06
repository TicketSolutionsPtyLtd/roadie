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
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { MOD, clickIntoEditor } from './testUtils'

const LABEL = 'Newsletter'

// Unstyled, the dialog sits under the overlay Base UI holds the page with.
let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const VARIABLES: EditorVariable[] = [
  { key: 'first_name', label: 'First name', tokens: { ae: '#FirstName#' } }
]

const MJML = `<mjml><mj-body><mj-section><mj-column>
  <mj-text><h2>Doors 7pm</h2></mj-text>
  <mj-button href="https://www.oztix.com.au">Get tickets</mj-button>
</mj-column></mj-section></mj-body></mjml>`

const text = (value: string): JSONContent => ({ type: 'text', text: value })
const paragraph = (value: string): JSONContent => ({
  type: 'paragraph',
  content: [text(value)]
})
const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const IMPORTED = [
  { type: 'heading', attrs: { level: 2 }, content: [text('Doors 7pm')] },
  {
    type: 'button',
    attrs: { href: 'https://www.oztix.com.au' },
    content: [text('Get tickets')]
  }
]

// The editor keeps a line after a closing button, to type on.
const REPLACED = [...IMPORTED, { type: 'paragraph' }]

function renderEmail(defaultValue?: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      toolbar='docked'
      variables={VARIABLES}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall?.[0].doc.content

async function openImport() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Import HTML or MJML' })
  )
  return screen.findByRole('dialog', { name: 'Import HTML or MJML' })
}

// Firefox ignores the clipboardData a ClipboardEvent is made with and gives
// it an empty one, so the data is set on the event itself.
function paste(target: HTMLElement, data: Record<string, string>) {
  const clipboardData = new DataTransfer()
  for (const [type, value] of Object.entries(data)) {
    clipboardData.setData(type, value)
  }
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  target.dispatchEvent(event)
}

// The dialog portals to the body, so React unmounts it before it empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor email import', () => {
  it.each([
    ['an MJML file', 'newsletter.mjml', ''],
    ['an HTML file', 'newsletter.html', 'text/html']
  ])('reads %s into Source', async (_, name, type) => {
    renderEmail()
    const dialog = await openImport()
    const input = within(dialog).getByLabelText('Email file')
    expect(input).toHaveAttribute('accept', '.html,.htm,.mjml,text/html')

    await userEvent.upload(input, new File([MJML], name, { type }))

    await waitFor(() =>
      expect(
        within(dialog).getByRole('textbox', { name: 'Source' })
      ).toHaveValue(MJML)
    )
  })

  it('opens the file picker from Choose a file', async () => {
    renderEmail()
    const dialog = await openImport()
    const input = within(dialog).getByLabelText<HTMLInputElement>('Email file')
    const picked = vi.fn((event: Event) => event.preventDefault())
    input.addEventListener('click', picked)

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Choose a file' })
    )

    expect(picked).toHaveBeenCalled()
  })

  it('imports MJML into an empty email from the toolbar', async () => {
    const onValueChange = renderEmail()
    const dialog = await openImport()
    const source = within(dialog).getByRole('textbox', { name: 'Source' })

    expect(
      within(dialog).getByRole('button', { name: 'Import' })
    ).toBeDisabled()
    await userEvent.fill(source, MJML)
    // The format reads from a deferred copy of the source, which WebKit can
    // render a beat later.
    expect(await within(dialog).findByText('Reading it as MJML.')).toBeVisible()
    expect(within(dialog).queryByRole('radiogroup')).toBeNull()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(lastDoc(onValueChange)).toEqual(REPLACED)
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
  })

  it('says what won’t come across before importing', async () => {
    renderEmail()
    const dialog = await openImport()

    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      '<table><tr><td style="color:red">Hi #FirstName#, #Promoter# here</td></tr></table><img src="http://cdn.oztix.com.au/old.jpg">'
    )

    const losses = await within(dialog).findByText(
      'Some of it won’t come across'
    )
    const callout = losses.closest('[data-slot="callout"]') ?? dialog
    expect(
      within(callout as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([
      '1 image that isn’t on https',
      '1 merge tag this editor doesn’t know, kept as text: #Promoter#',
      '1 table’s layout, keeping its text',
      '1 style, such as a font or colour'
    ])
    expect(
      await within(dialog).findByText('Reading it as HTML.')
    ).toBeInTheDocument()
  })

  it('reads a known merge tag as a merge tag', async () => {
    const onValueChange = renderEmail()
    const dialog = await openImport()

    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      '<p>Hi #FirstName#</p>'
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange)).toEqual([
        {
          type: 'paragraph',
          content: [
            text('Hi '),
            { type: 'variable', attrs: { key: 'first_name' } }
          ]
        }
      ])
    )
  })

  it('adds below the cursor in an email with content', async () => {
    const onValueChange = renderEmail(
      email(paragraph('Doors'), paragraph('Encore'))
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('Doors'))
    const dialog = await openImport()

    expect(
      within(dialog).getByRole('radio', { name: 'Below the cursor' })
    ).toBeChecked()
    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      MJML
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange)).toEqual([
        paragraph('Doors'),
        ...IMPORTED,
        paragraph('Encore')
      ])
    )
  })

  it('replaces the email when asked, and undo brings it back', async () => {
    const onValueChange = renderEmail(email(paragraph('Doors')))
    const dialog = await openImport()

    await userEvent.click(
      within(dialog).getByText('In place of the whole email')
    )
    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      MJML
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    )
    await waitFor(() => expect(lastDoc(onValueChange)).toEqual(REPLACED))
    const textbox = screen.getByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(lastDoc(onValueChange)).toEqual([paragraph('Doors')])
    )
  })

  it('puts the caret in the first text, past a leading image', async () => {
    const onValueChange = renderEmail()
    const dialog = await openImport()

    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      '<img src="https://cdn.oztix.com.au/hero.jpg" alt="Hero"><p>Doors</p>'
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    )
    const textbox = screen.getByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard('Gates ')

    await waitFor(() =>
      expect(lastDoc(onValueChange)?.[1]).toEqual(paragraph('Gates Doors'))
    )
  })

  it('cancels without changing the email', async () => {
    const onValueChange = renderEmail(email(paragraph('Doors')))
    const dialog = await openImport()

    await userEvent.fill(
      within(dialog).getByRole('textbox', { name: 'Source' }),
      MJML
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it.each([
    ['MJML', MJML],
    ['a whole page', '<!DOCTYPE html><html><body><p>Doors</p></body></html>'],
    ['a fragment', '<table><tr><td>Doors</td></tr></table>']
  ])('opens the import for %s pasted as text', async (_, source) => {
    const onValueChange = renderEmail()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(textbox)

    paste(textbox, {
      'text/plain': source,
      'text/html': `<pre>${source}</pre>`
    })

    const dialog = await screen.findByRole('dialog', {
      name: 'Import HTML or MJML'
    })
    expect(within(dialog).getByRole('textbox', { name: 'Source' })).toHaveValue(
      source
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it.each(['<3 the encore', '<br> breaks a line'])(
    'pastes %s as it is',
    async (pasted) => {
      const onValueChange = renderEmail()
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await clickIntoEditor(textbox)

      paste(textbox, { 'text/plain': pasted })

      await waitFor(() =>
        expect(lastDoc(onValueChange)).toEqual([paragraph(pasted)])
      )
      expect(screen.queryByRole('dialog')).toBeNull()
    }
  )

  it('offers no import outside the email preset', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor aria-label={LABEL} preset='rich' onValueChange={onValueChange} />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    expect(
      screen.queryByRole('button', { name: 'Import HTML or MJML' })
    ).toBeNull()

    await clickIntoEditor(textbox)
    paste(textbox, { 'text/plain': '<p>Doors</p>' })

    await waitFor(() =>
      expect(lastDoc(onValueChange)).toEqual([paragraph('<p>Doors</p>')])
    )
  })
})
