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

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'

const LABEL = 'Newsletter'

const email = (preheader?: string): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: {
    type: 'doc',
    ...(preheader && { attrs: { preheader } }),
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
})

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function renderEmail(props: Partial<EditorProps> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={email()}
      toolbar='docked'
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const lastValue = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall?.[0] as EditorValue | undefined

const previewText = () => screen.findByRole('textbox', { name: 'Preview text' })

describe('Editor preheader', () => {
  it('saves the preview text as the email’s preheader', async () => {
    const onValueChange = renderEmail()

    await userEvent.type(await previewText(), 'Two weeks to go')

    await waitFor(() =>
      expect(lastValue(onValueChange)?.doc.attrs).toEqual({
        preheader: 'Two weeks to go'
      })
    )
    expect(lastValue(onValueChange)?.doc.content).toEqual(email().doc.content)
  })

  it('saves none once it’s cleared', async () => {
    const onValueChange = renderEmail({ defaultValue: email('Two weeks') })
    const input = await previewText()
    expect(input).toHaveValue('Two weeks')

    await userEvent.clear(input)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(lastValue(onValueChange)?.doc.attrs).toBeUndefined()
  })

  it('shows a controlled value’s preheader as it changes', async () => {
    const { rerender } = render(
      <Editor aria-label={LABEL} value={email('Two weeks')} />
    )
    expect(await previewText()).toHaveValue('Two weeks')

    rerender(<Editor aria-label={LABEL} value={email('One week')} />)

    await waitFor(async () =>
      expect(await previewText()).toHaveValue('One week')
    )
  })

  it('can’t be changed in a read-only editor', async () => {
    renderEmail({ readOnly: true, defaultValue: email('Two weeks') })
    expect(await previewText()).toHaveAttribute('readonly')
  })

  it('isn’t there outside the email preset', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    await screen.findByRole('textbox', { name: LABEL })
    expect(screen.queryByRole('textbox', { name: 'Preview text' })).toBeNull()
  })

  describe('on import', () => {
    async function importInPlace(source: string) {
      await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(
        screen.getByRole('button', { name: 'Import HTML or MJML' })
      )
      const dialog = await screen.findByRole('dialog', {
        name: 'Import HTML or MJML'
      })
      await userEvent.fill(
        within(dialog).getByRole('textbox', { name: 'Source' }),
        source
      )
      await userEvent.click(
        within(dialog).getByRole('radio', {
          name: /In place of the whole email/
        })
      )
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Import' })
      )
    }

    it('keeps the preheader when the source has none', async () => {
      const onValueChange = renderEmail({ defaultValue: email('Two weeks') })

      await importInPlace('<p>Sold out</p>')

      await waitFor(() =>
        expect(lastValue(onValueChange)?.doc.content?.[0]).toMatchObject({
          content: [{ text: 'Sold out' }]
        })
      )
      expect(lastValue(onValueChange)?.doc.attrs).toEqual({
        preheader: 'Two weeks'
      })
    })

    it('takes the source’s preheader in place of the whole email', async () => {
      const onValueChange = renderEmail({ defaultValue: email('Two weeks') })

      await importInPlace(
        '<mjml><mj-head><mj-preview>Sold out</mj-preview></mj-head><mj-body><mj-section><mj-column><mj-text>Doors</mj-text></mj-column></mj-section></mj-body></mjml>'
      )

      await waitFor(() =>
        expect(lastValue(onValueChange)?.doc.attrs).toEqual({
          preheader: 'Sold out'
        })
      )
      expect(await previewText()).toHaveValue('Sold out')
    })
  })
})
