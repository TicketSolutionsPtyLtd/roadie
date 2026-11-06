import { useState } from 'react'

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

import { Dialog } from '@oztix/roadie-components/dialog'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { clickIntoEditor, selectParagraph } from './testUtils'

const LABEL = 'Event description'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender?ref=email'
const CARD = 'Link actions'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const VARIABLES: EditorVariable[] = [
  {
    key: 'unsubscribe_url',
    label: 'Unsubscribe page',
    kind: 'url',
    tokens: { ae: '#OptOut#' }
  }
]

const linked = (text: string, attrs: Record<string, unknown>) => ({
  type: 'paragraph',
  content: [
    { type: 'text', text: 'Grab ' },
    { type: 'text', text, marks: [{ type: 'link', attrs }] },
    { type: 'text', text: ' soon.' }
  ]
})

const valueOf = (
  preset: 'rich' | 'email',
  block: JSONContent
): EditorValue => ({
  version: 1,
  preset,
  doc: {
    type: 'doc',
    content: [
      block,
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
})

function renderEditor(value: EditorValue) {
  const onValueChange = vi.fn()
  render(
    <div style={{ padding: '96px 24px' }}>
      <Editor
        aria-label={LABEL}
        preset={value.preset}
        variables={VARIABLES}
        defaultValue={value}
        onValueChange={onValueChange}
      />
    </div>
  )
  return onValueChange
}

async function caretIn(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(within(textbox).getByText(text))
  return textbox
}

const card = () => screen.findByRole('toolbar', { name: CARD })

describe('Editor link card', () => {
  it('shows where a link goes, opening it in a new tab', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    await caretIn('your tickets')

    const target = within(await card()).getByRole('link')
    expect(target).toHaveTextContent('oztix.com.au/ochre-kite-weekender')
    expect(target).toHaveAttribute('href', TICKETS)
    expect(target).toHaveAttribute('target', '_blank')
    expect(target).toHaveAttribute('title', TICKETS)
  })

  it('hangs under the link, clear of its text', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    const textbox = await caretIn('your tickets')

    const box = (await card()).getBoundingClientRect()
    const link = within(textbox)
      .getByText('your tickets')
      .getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(link.bottom)
    expect(Math.abs(box.left - link.left)).toBeLessThanOrEqual(16)
  })

  it('names a link variable rather than an address', async () => {
    renderEditor(
      valueOf('email', linked('Unsubscribe', { variable: 'unsubscribe_url' }))
    )
    await caretIn('Unsubscribe')

    const shown = await card()
    expect(within(shown).getByText('Unsubscribe page')).toBeVisible()
    expect(within(shown).queryByRole('link')).toBe(null)
  })

  it('opens the link editor from Edit', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    await caretIn('your tickets')

    await userEvent.click(
      within(await card()).getByRole('button', { name: 'Edit link' })
    )

    const url = await screen.findByRole('textbox', { name: 'Link' })
    expect(url).toHaveValue(TICKETS)
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })

  it('removes the whole link from Remove, keeping the caret in the text', async () => {
    const onValueChange = renderEditor(
      valueOf('rich', linked('your tickets', { href: TICKETS }))
    )
    const textbox = await caretIn('your tickets')

    await userEvent.click(
      within(await card()).getByRole('button', { name: 'Remove link' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content?.[0]
      ).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Grab your tickets soon.' }]
      })
    )
    await waitFor(() => expect(textbox).toHaveFocus())
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })

  it('shows only at a caret in a link', async () => {
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    const textbox = await caretIn('Doors 7pm')
    await screen.findByRole('toolbar', { name: 'Formatting' })
    expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)

    await selectParagraph(within(textbox).getByText('your tickets'))
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })
  it('hides once the editor turns read-only', async () => {
    const value = valueOf('rich', linked('your tickets', { href: TICKETS }))
    function Toggled() {
      const [readOnly, setReadOnly] = useState(false)
      return (
        <div style={{ padding: '96px 24px' }}>
          <button type='button' onClick={() => setReadOnly(true)}>
            Lock
          </button>
          <Editor aria-label={LABEL} defaultValue={value} readOnly={readOnly} />
        </div>
      )
    }
    render(<Toggled />)
    await caretIn('your tickets')
    await card()

    screen.getByRole('button', { name: 'Lock' }).click()

    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: CARD })).toBe(null)
    )
  })

  it('moves focus back to the text on Escape, leaving a dialog around it open', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Title>Compose</Dialog.Title>
          <Editor
            aria-label={LABEL}
            defaultValue={valueOf(
              'rich',
              linked('your tickets', { href: TICKETS })
            )}
          />
        </Dialog.Content>
      </Dialog>
    )
    const textbox = await caretIn('your tickets')
    const edit = within(await card()).getByRole('button', { name: 'Edit link' })
    edit.focus()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(textbox).toHaveFocus())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
  it('keeps a touch screen’s docked bar above the keyboard in the link editor', async () => {
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      matchMedia(query.replaceAll('(pointer: coarse)', 'all'))
    )
    onTestFinished(() => {
      vi.restoreAllMocks()
    })
    renderEditor(valueOf('rich', linked('your tickets', { href: TICKETS })))
    await caretIn('your tickets')
    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    const viewport = window.visualViewport!
    const docked = () =>
      Math.abs(
        bar.getBoundingClientRect().bottom -
          (viewport.offsetTop + viewport.height)
      ) < 1
    await waitFor(() => expect(docked()).toBe(true))

    await userEvent.click(
      within(await card()).getByRole('button', { name: 'Edit link' })
    )
    const url = await screen.findByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(url).toHaveFocus())
    // As a control that re-renders as it's tapped drops focus to the page.
    url.blur()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)

    expect(document.activeElement).toBe(document.body)
    expect(docked()).toBe(true)
  })

  it('stays on screen for a link at the bottom of a phone’s screen, clear of the docked bar', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      matchMedia(query.replaceAll('(pointer: coarse)', 'all'))
    )
    onTestFinished(() => {
      vi.restoreAllMocks()
    })
    const value = valueOf('rich', linked('your tickets', { href: TICKETS }))
    render(
      <>
        <div style={{ blockSize: 560 }} />
        <Editor aria-label={LABEL} defaultValue={value} />
        <div style={{ blockSize: 40 }} />
      </>
    )
    await caretIn('your tickets')
    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })

    const shown = await card()
    await waitFor(() => {
      const box = shown.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.bottom).toBeLessThanOrEqual(bar.getBoundingClientRect().top)
    })
  })
  it('keeps a tapped link in view above a phone’s docked bar', async () => {
    await page.viewport(390, 844)
    onTestFinished(() => page.viewport(1280, 800))
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      matchMedia(query.replaceAll('(pointer: coarse)', 'all'))
    )
    onTestFinished(() => {
      vi.restoreAllMocks()
      window.scrollTo(0, 0)
    })
    const filler = Array.from({ length: 30 }, (_, index) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: `Set time ${index + 1}` }]
    }))
    render(
      <>
        <Editor
          aria-label={LABEL}
          preset='email'
          variables={VARIABLES}
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                ...filler,
                linked('Unsubscribe', { variable: 'unsubscribe_url' }),
                ...filler
              ]
            }
          }}
        />
        <div style={{ blockSize: 800 }} />
      </>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const link = within(textbox).getByText('Unsubscribe')
    link.scrollIntoView({ block: 'center' })

    await clickIntoEditor(link)

    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    const shown = await card()
    await waitFor(() => {
      const barTop = bar.getBoundingClientRect().top
      const box = link.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.bottom).toBeLessThanOrEqual(barTop)
      const cardBox = shown.getBoundingClientRect()
      expect(cardBox.top).toBeGreaterThanOrEqual(0)
      expect(cardBox.bottom).toBeLessThanOrEqual(barTop)
    })
  })
})
