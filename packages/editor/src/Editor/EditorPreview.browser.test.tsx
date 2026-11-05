import {
  act,
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

import { Editor, type EditorPreviewRecipient, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'
import { selectParagraph } from './testUtils'

const LABEL = 'Newsletter'

const VALUE: EditorValue = {
  version: 1,
  preset: 'email',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
}

const RECIPIENTS: EditorPreviewRecipient[] = [
  { label: 'Alex, 12 tickets left', values: { first_name: 'Alex' } },
  { label: 'No name', values: {} }
]

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

const rendered = (values: Readonly<Record<string, string>>) =>
  `<p>Hi ${values.first_name ?? 'there'}</p>`

function renderEditor(props: Partial<EditorProps> = {}) {
  const onRenderPreview = vi.fn(
    async (
      _value: EditorValue,
      { values }: { values: Readonly<Record<string, string>> }
    ) => rendered(values)
  )
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={VALUE}
      toolbar='docked'
      onRenderPreview={onRenderPreview}
      {...props}
    />
  )
  return onRenderPreview
}

async function openPreview() {
  await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
  return screen.findByTitle('Email preview')
}

describe('Editor preview', () => {
  it('shows the email as the host renders it, in place of the canvas', async () => {
    const onRenderPreview = renderEditor()
    const frame = await openPreview()

    await waitFor(() =>
      expect(frame).toHaveAttribute('srcdoc', '<p>Hi there</p>')
    )
    expect(onRenderPreview).toHaveBeenCalledWith(
      expect.objectContaining({ doc: VALUE.doc }),
      { values: {} }
    )
    expect(frame).toHaveAttribute('sandbox', '')
    expect(screen.queryByRole('textbox', { name: LABEL })).toBeNull()
    expect(screen.queryByRole('toolbar', { name: 'Formatting' })).toBeNull()
  })

  it('goes back to the canvas', async () => {
    renderEditor()
    await openPreview()

    await userEvent.click(
      screen.getByRole('button', { name: 'Back to editing' })
    )

    expect(await screen.findByRole('textbox', { name: LABEL })).toBeVisible()
    expect(screen.queryByTitle('Email preview')).toBeNull()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
    )
  })

  it('goes back to the canvas on Escape', async () => {
    renderEditor()
    await openPreview()

    await userEvent.keyboard('{Escape}')

    expect(await screen.findByRole('textbox', { name: LABEL })).toBeVisible()
  })

  it('moves focus into the preview, so it isn’t lost with the toolbar', async () => {
    renderEditor()
    await openPreview()

    expect(
      screen.getByRole('button', { name: 'Back to editing' })
    ).toHaveFocus()
  })

  it('shows the email 600px wide, or on a phone', async () => {
    renderEditor()
    const frame = await openPreview()
    expect(frame.getBoundingClientRect().width).toBe(600)

    await userEvent.click(screen.getByRole('button', { name: 'Phone' }))

    await waitFor(() => expect(frame.getBoundingClientRect().width).toBe(375))
  })

  it('keeps the frame light for a simulated dark mode, which inverts it', async () => {
    renderEditor()
    const frame = await openPreview()

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

    await waitFor(() =>
      expect(frame.getAttribute('srcdoc')).toContain('light only')
    )
    expect(getComputedStyle(frame).colorScheme).toBe('light')
  })

  it('simulates a mail app’s forced dark mode, and says so', async () => {
    renderEditor()
    const frame = await openPreview()
    await waitFor(() => expect(frame).toHaveAttribute('srcdoc'))
    expect(screen.queryByText(/Simulated dark mode/)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

    await waitFor(() =>
      expect(frame.getAttribute('srcdoc')).toContain('invert(1)')
    )
    expect(screen.getByText(/Simulated dark mode/)).toBeVisible()
  })

  it('shows the inbox row with the sender, subject and preview', async () => {
    renderEditor({
      sender: 'Ochre Kite Weekender',
      subject: 'Two weeks to go'
    })
    await openPreview()

    const inbox = screen.getByRole('group', { name: 'In the inbox' })
    expect(inbox).toHaveTextContent('Ochre Kite Weekender')
    expect(inbox).toHaveTextContent('Two weeks to go')
  })

  it('shows no inbox row with nothing to put in it', async () => {
    renderEditor()
    await openPreview()
    expect(screen.queryByRole('group', { name: 'In the inbox' })).toBeNull()
  })

  describe('on a phone', () => {
    function renderNarrow(props: Partial<EditorProps> = {}) {
      const onRenderPreview = vi.fn(
        async (
          _value: EditorValue,
          { values }: { values: Readonly<Record<string, string>> }
        ) => rendered(values)
      )
      render(
        <div style={{ width: 390 }} data-testid='phone'>
          <Editor
            aria-label={LABEL}
            defaultValue={VALUE}
            toolbar='docked'
            onRenderPreview={onRenderPreview}
            previewRecipients={RECIPIENTS}
            onSendTest={async () => {}}
            {...props}
          />
        </div>
      )
      return onRenderPreview
    }

    it('scales the frame to fit, at either width', async () => {
      renderNarrow()
      const frame = await openPreview()
      const room = screen.getByTestId('phone').getBoundingClientRect()

      for (const width of ['Desktop', 'Phone']) {
        await userEvent.click(screen.getByRole('button', { name: width }))
        await waitFor(() => {
          const box = frame.getBoundingClientRect()
          expect(box.left).toBeGreaterThanOrEqual(room.left)
          expect(box.right).toBeLessThanOrEqual(room.right)
        })
      }
      expect(frame.style.width).toBe('375px')
    })

    it('keeps its controls on one row', async () => {
      renderNarrow()
      await openPreview()
      const bar = screen.getByRole('group', { name: 'Preview' })
      const middles = within(bar)
        .getAllByRole('button')
        .map((button) => {
          const { top, bottom } = button.getBoundingClientRect()
          return (top + bottom) / 2
        })
      expect(Math.max(...middles) - Math.min(...middles)).toBeLessThan(4)
      expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
    })

    it('previews as a recipient from its icon’s menu', async () => {
      const onRenderPreview = renderNarrow()
      await openPreview()
      expect(screen.queryByRole('combobox', { name: 'Preview as' })).toBeNull()

      await userEvent.click(screen.getByRole('button', { name: 'Preview as' }))
      await userEvent.click(
        await screen.findByRole('menuitemradio', { name: 'No name' })
      )

      await waitFor(() =>
        expect(onRenderPreview).toHaveBeenLastCalledWith(expect.anything(), {
          values: {}
        })
      )
    })
  })

  it('previews as each recipient, with their values', async () => {
    const onRenderPreview = renderEditor({ previewRecipients: RECIPIENTS })
    const frame = await openPreview()
    await waitFor(() =>
      expect(frame).toHaveAttribute('srcdoc', '<p>Hi Alex</p>')
    )

    await userEvent.click(screen.getByRole('combobox', { name: 'Preview as' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'No name' })
    )

    await waitFor(() =>
      expect(frame).toHaveAttribute('srcdoc', '<p>Hi there</p>')
    )
    expect(onRenderPreview).toHaveBeenLastCalledWith(expect.anything(), {
      values: {}
    })
  })

  it('renders once for a host that passes its recipients inline', async () => {
    const onRenderPreview = vi.fn(async () => '<p>Hi</p>')
    const view = (count: number) => (
      <div data-count={count}>
        <Editor
          aria-label={LABEL}
          defaultValue={VALUE}
          toolbar='docked'
          onRenderPreview={onRenderPreview}
          previewRecipients={RECIPIENTS.map((each) => ({ ...each }))}
        />
      </div>
    )
    const { rerender } = render(view(0))
    await openPreview()
    await waitFor(() => expect(onRenderPreview).toHaveBeenCalledTimes(1))

    rerender(view(1))
    await act(async () => {})

    expect(onRenderPreview).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Preview as', () => screen.getByRole('combobox', { name: 'Preview as' })],
    ['Send test', () => screen.getByRole('button', { name: 'Send test' })]
  ])('closes only %s on Escape', async (_, trigger) => {
    renderEditor({
      previewRecipients: RECIPIENTS,
      onSendTest: async () => {}
    })
    await openPreview()
    await userEvent.click(trigger())
    await waitFor(() =>
      expect(
        screen.queryByRole('listbox') ??
          screen.queryByRole('textbox', { name: 'Send to' })
      ).not.toBeNull()
    )

    await userEvent.keyboard('{Escape}')

    await waitFor(() =>
      expect(
        screen.queryByRole('listbox') ??
          screen.queryByRole('textbox', { name: 'Send to' })
      ).toBeNull()
    )
    expect(screen.getByTitle('Email preview')).toBeVisible()
  })

  it('offers no Preview as without recipients', async () => {
    renderEditor()
    await openPreview()
    expect(screen.queryByRole('combobox', { name: 'Preview as' })).toBeNull()
  })

  it('keeps only the latest render when an earlier one lands late', async () => {
    let finishFirst: (html: string) => void = () => {}
    const onRenderPreview = vi.fn(
      (
        _value: EditorValue,
        { values }: { values: Readonly<Record<string, string>> }
      ) =>
        values.first_name
          ? new Promise<string>((resolve) => {
              finishFirst = resolve
            })
          : Promise.resolve(rendered(values))
    )
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={VALUE}
        toolbar='docked'
        onRenderPreview={onRenderPreview}
        previewRecipients={RECIPIENTS}
      />
    )
    const frame = await openPreview()
    await userEvent.click(screen.getByRole('combobox', { name: 'Preview as' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'No name' })
    )
    await waitFor(() =>
      expect(frame).toHaveAttribute('srcdoc', '<p>Hi there</p>')
    )

    // act waits for the late render's state update, if it makes one.
    await act(async () => finishFirst('<p>Hi Alex</p>'))

    expect(frame).toHaveAttribute('srcdoc', '<p>Hi there</p>')
  })

  it('says why when the email doesn’t render', async () => {
    renderEditor({
      onRenderPreview: () => Promise.reject(new Error('MJML said no'))
    })
    await openPreview()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The preview didn’t load. MJML said no'
    )
  })

  it('offers Preview in the floating toolbar’s More menu', async () => {
    renderEditor({ toolbar: 'floating' })
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await selectParagraph(within(textbox).getByText('Doors 7pm'))
    const floating = await screen.findByRole('toolbar', {
      name: 'Selection formatting'
    })
    await userEvent.click(
      within(floating).getByRole('button', { name: 'More' })
    )

    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Preview' })
    )

    expect(await screen.findByTitle('Email preview')).toBeVisible()
  })

  it('offers no Preview without onRenderPreview', async () => {
    render(<Editor aria-label={LABEL} defaultValue={VALUE} toolbar='docked' />)
    await screen.findByRole('textbox', { name: LABEL })
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull()
  })

  describe('Send test', () => {
    it('isn’t there without onSendTest', async () => {
      renderEditor()
      await openPreview()
      expect(screen.queryByRole('button', { name: 'Send test' })).toBeNull()
    })

    it('sends the email as previewed to an address', async () => {
      const onSendTest = vi.fn(async () => {})
      renderEditor({ onSendTest, previewRecipients: RECIPIENTS })
      await openPreview()

      await userEvent.click(screen.getByRole('button', { name: 'Send test' }))
      const address = await screen.findByRole('textbox', {
        name: 'Send to'
      })
      await userEvent.type(address, 'promoter@example.com{Enter}')

      await waitFor(() =>
        expect(onSendTest).toHaveBeenCalledWith(
          expect.objectContaining({ doc: VALUE.doc }),
          { to: 'promoter@example.com', values: { first_name: 'Alex' } }
        )
      )
      // The popup can still be fading in on a loaded machine.
      expect(
        await screen.findByText('Sent to promoter@example.com')
      ).toBeInTheDocument()
    })

    it('won’t send to something that isn’t an address', async () => {
      const onSendTest = vi.fn(async () => {})
      renderEditor({ onSendTest })
      await openPreview()

      await userEvent.click(screen.getByRole('button', { name: 'Send test' }))
      await userEvent.type(
        await screen.findByRole('textbox', { name: 'Send to' }),
        'promoter{Enter}'
      )

      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
      expect(onSendTest).not.toHaveBeenCalled()
    })

    it('says why Send is off', async () => {
      renderEditor({ onSendTest: async () => {} })
      await openPreview()
      await userEvent.click(screen.getByRole('button', { name: 'Send test' }))
      const address = await screen.findByRole('textbox', { name: 'Send to' })

      expect(
        screen.getByText('Enter the address to send a test to.')
      ).toBeInTheDocument()
      await userEvent.type(address, 'promoter')
      expect(
        screen.getByText('Enter a whole address, such as name@example.com.')
      ).toBeInTheDocument()
    })

    it('says why Send is off after a send', async () => {
      renderEditor({ onSendTest: async () => {} })
      await openPreview()
      await userEvent.click(screen.getByRole('button', { name: 'Send test' }))
      const address = await screen.findByRole('textbox', { name: 'Send to' })
      await userEvent.type(address, 'promoter@example.com{Enter}')
      await screen.findByText('Sent to promoter@example.com')

      await userEvent.clear(address)

      expect(
        screen.getByText('Enter the address to send a test to.')
      ).toBeInTheDocument()
    })

    it('says why a send failed', async () => {
      renderEditor({
        onSendTest: () => Promise.reject(new Error('Mailbox full'))
      })
      await openPreview()

      await userEvent.click(screen.getByRole('button', { name: 'Send test' }))
      await userEvent.type(
        await screen.findByRole('textbox', { name: 'Send to' }),
        'promoter@example.com{Enter}'
      )

      expect(await screen.findByText(/Mailbox full/)).toBeInTheDocument()
    })
  })
})
