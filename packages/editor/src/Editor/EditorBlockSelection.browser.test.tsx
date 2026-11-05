import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'
import {
  LINE_END,
  LINE_START,
  MOD,
  clickIntoEditor,
  selectParagraph
} from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

const block = (blockId: string, text: string) => ({
  type: 'paragraph',
  attrs: { blockId },
  content: [{ type: 'text', text }]
})

const lineup: EditorValue = {
  version: 1,
  preset: 'blocks',
  doc: {
    type: 'doc',
    content: [
      block('doors', 'Doors 7pm'),
      block('support', 'Support 8pm'),
      block('headliner', 'Headliner 9pm'),
      block('curfew', 'Curfew 11pm')
    ]
  }
}

function renderLineup() {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={lineup}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const ids = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map(
    (node) => node.attrs?.blockId
  )

async function row(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  return within(textbox).getByText(text)
}

const tinted = async () =>
  Array.from(
    (await screen.findByRole('textbox', { name: LABEL })).querySelectorAll(
      '[data-selected-block]'
    ),
    (element) => element.textContent
  )

const moveDown = `{${MOD}>}{Shift>}{ArrowDown}{/Shift}{/${MOD}}`

describe('Editor block selection', () => {
  it('selects the caret’s block on Escape and grows it with Shift+ArrowDown', async () => {
    renderLineup()
    await clickIntoEditor(await row('Support 8pm'))

    await userEvent.keyboard('{Escape}')
    await waitFor(async () => expect(await tinted()).toEqual(['Support 8pm']))
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')

    await waitFor(async () =>
      expect(await tinted()).toEqual(['Support 8pm', 'Headliner 9pm'])
    )
    await userEvent.keyboard('{Shift>}{ArrowUp}{ArrowUp}{/Shift}')
    await waitFor(async () =>
      expect(await tinted()).toEqual(['Doors 7pm', 'Support 8pm'])
    )
  })

  it('rings a selected block, as a selected node is, with no tint', async () => {
    renderLineup()
    await clickIntoEditor(await row('Support 8pm'))

    await userEvent.keyboard('{Escape}')

    const block = await row('Support 8pm')
    await waitFor(() =>
      expect(getComputedStyle(block).outlineStyle).toBe('solid')
    )
    expect(parseFloat(getComputedStyle(block).outlineWidth)).toBeGreaterThan(0)
    expect(getComputedStyle(block).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('carries on typing at a selected block’s end, and Enter goes back to it', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Support 8pm'))
    await userEvent.keyboard('{Escape}x')
    await userEvent.keyboard('{Escape}{Enter}!')

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map(
          (node) => node.content?.[0]?.text
        )
      ).toEqual(['Doors 7pm', 'Support 8pmx!', 'Headliner 9pm', 'Curfew 11pm'])
    )
  })

  it('hides the floating toolbar over selected blocks', async () => {
    render(
      <Editor aria-label={LABEL} defaultValue={lineup} toolbar='floating'>
        <Editor.Content />
        <Editor.BubbleMenu />
      </Editor>
    )
    await selectParagraph(await row('Support 8pm'))
    await screen.findByRole('toolbar', { name: 'Selection formatting' })

    await userEvent.keyboard('{Escape}')

    await waitFor(() =>
      expect(
        screen.queryByRole('toolbar', { name: 'Selection formatting' })
      ).toBe(null)
    )
  })

  it('moves every selected block with the move keys', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Doors 7pm'))
    await userEvent.keyboard('{Escape}{Shift>}{ArrowDown}{/Shift}')

    await userEvent.keyboard(moveDown)

    await waitFor(() =>
      expect(ids(onValueChange)).toEqual([
        'headliner',
        'doors',
        'support',
        'curfew'
      ])
    )
    expect(await tinted()).toEqual(['Doors 7pm', 'Support 8pm'])
  })

  it('moves the blocks a text selection spans, not only the first', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Doors 7pm'))
    await userEvent.keyboard(LINE_START)
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')

    await userEvent.keyboard(moveDown)

    await waitFor(() =>
      expect(ids(onValueChange)).toEqual([
        'headliner',
        'doors',
        'support',
        'curfew'
      ])
    )
  })

  it('heads the block menu with the count, and deletes every selected block', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Support 8pm'))
    await userEvent.keyboard('{Escape}{Shift>}{ArrowDown}{/Shift}')

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
    const menu = await screen.findByRole('menu')
    await waitFor(() =>
      expect(
        within(menu).getByRole('group', { name: '2 blocks' })
      ).toBeVisible()
    )
    expect(
      within(menu).queryByRole('menuitem', { name: 'Copy link to block' })
    ).toBe(null)
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    )

    await waitFor(() => expect(ids(onValueChange)).toEqual(['doors', 'curfew']))
  })

  it('duplicates every selected block with Mod+D', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Headliner 9pm'))
    await userEvent.keyboard('{Escape}{Shift>}{ArrowDown}{/Shift}')

    await userEvent.keyboard(`{${MOD}>}d{/${MOD}}`)

    await waitFor(() => expect(ids(onValueChange)).toHaveLength(6))
    const texts = (
      onValueChange.mock.lastCall![0] as EditorValue
    ).doc.content!.map((node) => node.content?.[0]?.text)
    expect(texts).toEqual([
      'Doors 7pm',
      'Support 8pm',
      'Headliner 9pm',
      'Curfew 11pm',
      'Headliner 9pm',
      'Curfew 11pm'
    ])
    expect(new Set(ids(onValueChange)).size).toBe(6)
  })

  it('turns every selected block into a heading from the menu', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Doors 7pm'))
    await userEvent.keyboard('{Escape}{Shift>}{ArrowDown}{/Shift}')
    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)

    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Turn into' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Heading 3' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc
          .content!.slice(0, 3)
          .map((node) => [node.type, node.attrs?.level])
      ).toEqual([
        ['heading', 3],
        ['heading', 3],
        ['paragraph', undefined]
      ])
    )
  })

  it('goes back to a caret on ArrowDown, after the selected blocks', async () => {
    const onValueChange = renderLineup()
    await clickIntoEditor(await row('Doors 7pm'))
    await userEvent.keyboard('{Escape}{Shift>}{ArrowDown}{/Shift}')

    await userEvent.keyboard('{ArrowDown}!')

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content![1]!
          .content![0]!.text
      ).toBe('Support 8pm!')
    )
  })
})

describe('Editor text selection across a section', () => {
  it('types in order after selecting from a section’s last line down to the next', async () => {
    const onValueChange = vi.fn()
    const p = (text: string) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }]
    })
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              { type: 'section', content: [p('Doors 7pm')] },
              p('Gates 6pm')
            ]
          }
        }}
        onValueChange={onValueChange}
      />
    )
    await clickIntoEditor(await row('Doors 7pm'))
    await userEvent.keyboard(LINE_END)

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await userEvent.keyboard('xyz')

    await waitFor(() =>
      expect(
        JSON.stringify((onValueChange.mock.lastCall![0] as EditorValue).doc)
      ).toContain('Doors 7pmxyz')
    )
  })
})

describe('Editor block drop', () => {
  async function dragOnto(from: string, to: string, half: 'top' | 'bottom') {
    await userEvent.hover(await row(from))
    const grip = await screen.findByRole('button', { name: 'Block actions' })
    const target = await row(to)
    const { offsetWidth, offsetHeight } = target
    // Near the end of the line, where ProseMirror's own drop point says after.
    await userEvent.dragAndDrop(grip, target, {
      targetPosition: {
        x: offsetWidth - 4,
        y: half === 'top' ? 2 : offsetHeight - 2
      }
    })
  }

  it('drops a block before the one under the pointer’s top half', async () => {
    const onValueChange = renderLineup()

    await dragOnto('Headliner 9pm', 'Doors 7pm', 'top')

    await waitFor(() =>
      expect(ids(onValueChange)).toEqual([
        'headliner',
        'doors',
        'support',
        'curfew'
      ])
    )
  })

  it('drops a block after the one under the pointer’s bottom half', async () => {
    const onValueChange = renderLineup()

    await dragOnto('Curfew 11pm', 'Doors 7pm', 'bottom')

    await waitFor(() =>
      expect(ids(onValueChange)).toEqual([
        'doors',
        'curfew',
        'support',
        'headliner'
      ])
    )
  })
})
