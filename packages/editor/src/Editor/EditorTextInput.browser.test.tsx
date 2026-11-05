import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import type { EditorValue } from '../schema'
import { LINE_START, clickIntoEditor } from './testUtils'

const LABEL = 'Description'

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(textbox)
  return textbox
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc

describe('Editor typing', () => {
  it.each([
    ['"Sold out"', '“Sold out”'],
    ["Don't miss it", 'Don’t miss it'],
    ['Doors 7pm -- late', 'Doors 7pm — late'],
    ['And then...', 'And then…']
  ])('turns %j into %j as it’s typed', async (typed, shown) => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard(typed)

    await waitFor(() => expect(textbox).toHaveTextContent(shown))
  })

  it('leaves -- in a / query, as the insert menu reads it', async () => {
    render(<Editor aria-label={LABEL} preset='blocks' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/--')

    await waitFor(() => expect(textbox).toHaveTextContent('/--'))
  })

  it('puts back what was typed on Backspace straight after', async () => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()
    await userEvent.keyboard('And then... late --')
    await waitFor(() => expect(textbox).toHaveTextContent('And then… late —'))

    await userEvent.keyboard('{Backspace}')

    await waitFor(() => expect(textbox).toHaveTextContent('And then… late --'))
  })

  it.each([
    ['(c)', '(c)'],
    ['->', '->'],
    ['1/2 ', '1/2']
  ])('leaves %j as it’s typed', async (typed, shown) => {
    render(<Editor aria-label={LABEL} preset='rich' />)
    const textbox = await focusedTextbox()

    await userEvent.keyboard(typed)

    await waitFor(() => expect(textbox).toHaveTextContent(shown))
  })

  it.each(['rich', 'email'] as const)(
    'turns a heading into a paragraph on Backspace at its start, in %s',
    async (preset) => {
      const onValueChange = vi.fn()
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset,
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Doors' }]
                },
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Lineup' }]
                }
              ]
            }
          }}
          onValueChange={onValueChange}
        />
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await clickIntoEditor(
        within(textbox).getByRole('heading', { name: 'Lineup' })
      )
      await userEvent.keyboard(LINE_START)

      await userEvent.keyboard('{Backspace}')

      // StarterKit's trailing node follows a heading left last.
      await waitFor(() =>
        expect(lastDoc(onValueChange).content!.slice(0, 2)).toMatchObject([
          { type: 'paragraph', content: [{ text: 'Doors' }] },
          { type: 'paragraph', content: [{ text: 'Lineup' }] }
        ])
      )
    }
  )

  it('joins a paragraph back on Backspace at its start, as before', async () => {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'rich',
          doc: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Doors' }] },
              { type: 'paragraph', content: [{ type: 'text', text: '7pm' }] }
            ]
          }
        }}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText('7pm'))
    await userEvent.keyboard(LINE_START)

    await userEvent.keyboard('{Backspace}')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content).toMatchObject([
        { type: 'paragraph', content: [{ text: 'Doors7pm' }] }
      ])
    )
  })
})
