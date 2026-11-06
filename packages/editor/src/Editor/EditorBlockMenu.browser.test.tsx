import { render, screen, waitFor, within } from '@testing-library/react'
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
import type { EditorValue } from '../schema'
import { LINE_END, MOD } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => page.viewport(1280, 800))

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
      block('headliner', 'Headliner 9pm')
    ]
  }
}

function renderLineup(props: Partial<Parameters<typeof Editor>[0]> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={lineup}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc

const handle = () => screen.findByRole('button', { name: 'Block actions' })

async function row(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  return within(textbox).getByText(text, { exact: false })
}

async function openMenuOn(text: string) {
  const target = await row(text)
  await userEvent.hover(target)
  await waitFor(async () => {
    const { top, bottom } = target.getBoundingClientRect()
    const grip = (await handle()).getBoundingClientRect()
    expect((grip.top + grip.bottom) / 2).toBeGreaterThan(top)
    expect((grip.top + grip.bottom) / 2).toBeLessThan(bottom)
  })
  await userEvent.click(await handle())
  return screen.findByRole('menu')
}

describe('Editor block menu', () => {
  it('turns a block into another kind, keeping its text and id', async () => {
    const onValueChange = renderLineup()
    await openMenuOn('Support')

    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn into' }))
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Heading 2' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![1]).toEqual({
        type: 'heading',
        attrs: { level: 2, blockId: 'support' },
        content: [{ type: 'text', text: 'Support 8pm' }]
      })
    )
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
  })

  it('keeps the caret where it was in the text a block is turned into', async () => {
    const onValueChange = renderLineup()
    await userEvent.click(await row('Support'))
    await userEvent.keyboard(`${LINE_END}{${MOD}>}/{/${MOD}}`)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Turn into' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Heading 2' })
    )
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))

    await userEvent.keyboard('!')

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![1]).toMatchObject({
        type: 'heading',
        content: [{ type: 'text', text: 'Support 8pm!' }]
      })
    )
  })

  it('opens on a page whose hash isn’t a block’s, even one that won’t decode', async () => {
    const before = window.location.href
    window.history.replaceState(null, '', '#50%off')
    try {
      renderLineup()
      expect(
        await screen.findByRole('textbox', { name: LABEL })
      ).toBeInTheDocument()
      await userEvent.hover(await row('Doors'))
      expect(await handle()).toBeVisible()
    } finally {
      window.history.replaceState(null, '', before)
    }
  })

  it('turns a list back into a paragraph', async () => {
    const onValueChange = renderLineup({
      defaultValue: {
        ...lineup,
        doc: {
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              attrs: { blockId: 'acts' },
              content: [
                {
                  type: 'listItem',
                  attrs: { blockId: 'act' },
                  content: [block('support', 'Support 8pm')]
                }
              ]
            }
          ]
        }
      }
    })
    await openMenuOn('Support')

    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn into' }))
    expect(
      await screen.findByRole('menuitemradio', { name: 'Bulleted list' })
    ).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(
      screen.getByRole('menuitemradio', { name: 'Paragraph' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange).content![0]).toEqual(
        block('acts', 'Support 8pm')
      )
    )
  })

  it('offers no Turn into on a block that isn’t text', async () => {
    renderLineup({
      defaultValue: {
        ...lineup,
        doc: {
          type: 'doc',
          content: [
            block('doors', 'Doors 7pm'),
            { type: 'horizontalRule', attrs: { blockId: 'rule' } },
            block('support', 'Support 8pm')
          ]
        }
      }
    })
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.hover(textbox.querySelector('hr')!)
    await userEvent.click(await handle())
    await screen.findByRole('group', { name: 'Divider' })

    expect(screen.queryByRole('menuitem', { name: 'Turn into' })).toBe(null)
  })

  it('opens a line below with the insert menu', async () => {
    const onValueChange = renderLineup()
    await openMenuOn('Doors')

    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Insert below' })
    )

    expect(await screen.findByRole('listbox', { name: 'Insert' })).toBeVisible()
    await waitFor(() =>
      expect(lastDoc(onValueChange).content![1]).toMatchObject({
        type: 'paragraph',
        content: [{ type: 'text', text: '/' }]
      })
    )
    await userEvent.keyboard('Doors close')
    await waitFor(() =>
      expect(lastDoc(onValueChange).content![1]!.content).toEqual([
        { type: 'text', text: '/Doors close' }
      ])
    )
  })

  it('copies a link to the block, which scrolls to it when opened', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    renderLineup()
    await openMenuOn('Headliner')

    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Copy link to block' })
    )

    const link = new URL(window.location.href)
    link.hash = 'headliner'
    expect(writeText).toHaveBeenCalledWith(link.href)
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied')
    writeText.mockRestore()
  })

  it('offers no link to a block without an id', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Doors' }] }
            ]
          }
        }}
      />
    )
    await openMenuOn('Doors')

    expect(screen.queryByRole('menuitem', { name: 'Copy link to block' })).toBe(
      null
    )
  })

  it('stays open on the block after Move down, to move it again', async () => {
    const onValueChange = renderLineup()
    await openMenuOn('Doors')

    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))
    await waitFor(() =>
      expect(
        lastDoc(onValueChange).content!.map((b) => b.attrs!.blockId)
      ).toEqual(['support', 'doors', 'headliner'])
    )
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))

    await waitFor(() =>
      expect(
        lastDoc(onValueChange).content!.map((b) => b.attrs!.blockId)
      ).toEqual(['support', 'headliner', 'doors'])
    )
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('highlights the first action when Mod+/ opens the menu', async () => {
    const onValueChange = renderLineup()
    await userEvent.click(await row('Support'))

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)

    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Move up' })).toHaveFocus()
    )
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(
        lastDoc(onValueChange).content!.map((b) => b.attrs!.blockId)
      ).toEqual(['support', 'doors', 'headliner'])
    )
  })

  it('opens the menu beside the grip, clear of the text, where there’s room', async () => {
    document.body.style.paddingInlineStart = '320px'
    onTestFinished(() => {
      document.body.style.paddingInlineStart = ''
    })
    renderLineup()
    const menu = await openMenuOn('Support')

    await waitFor(async () =>
      expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(
        (await handle()).getBoundingClientRect().left
      )
    )
  })

  it('opens the menu beside the grip in right-to-left text, clear of it', async () => {
    document.body.style.paddingInline = '320px'
    onTestFinished(() => {
      document.body.style.paddingInline = ''
    })
    render(
      <div dir='rtl'>
        <Editor aria-label={LABEL} defaultValue={lineup} />
      </div>
    )
    const menu = await openMenuOn('Support')

    await waitFor(async () =>
      expect(menu.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        (await handle()).getBoundingClientRect().right
      )
    )
  })

  it('opens the menu below the grip where there’s no room beside it', async () => {
    renderLineup()
    const menu = await openMenuOn('Support')

    await waitFor(async () =>
      expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        (await handle()).getBoundingClientRect().bottom
      )
    )
  })

  describe('on a phone', () => {
    it('moves a block under a heading the page has, in one step', async () => {
      await page.viewport(390, 700)
      const onValueChange = renderLineup({
        defaultValue: {
          ...lineup,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 2, blockId: 'lineup' },
                content: [{ type: 'text', text: 'Lineup' }]
              },
              block('doors', 'Doors 7pm'),
              {
                type: 'heading',
                attrs: { level: 2, blockId: 'travel' },
                content: [{ type: 'text', text: 'Getting there' }]
              },
              block('parking', 'Parking on site')
            ]
          }
        }
      })
      await userEvent.click(await row('Doors'))
      await userEvent.click(await handle())
      const sheet = await screen.findByRole('dialog', { name: 'Paragraph' })

      await userEvent.click(
        within(sheet).getByRole('button', { name: 'Move to…' })
      )
      expect(
        within(sheet)
          .getAllByRole('button')
          .map((button) => button.textContent)
          .filter(Boolean)
      ).toContain('Getting there')
      await userEvent.click(
        within(sheet).getByRole('button', { name: 'Getting there' })
      )

      await waitFor(() =>
        expect(
          lastDoc(onValueChange).content!.map((b) => b.attrs!.blockId)
        ).toEqual(['lineup', 'travel', 'doors', 'parking'])
      )
    })

    it('opens the menu as a sheet from the bottom, with no keys', async () => {
      await page.viewport(390, 700)
      const onValueChange = renderLineup()
      await userEvent.click(await row('Support'))

      await userEvent.click(await handle())

      const sheet = await screen.findByRole('dialog', { name: 'Paragraph' })
      expect(sheet).toHaveAttribute('data-editor-popup')
      await waitFor(() => {
        const { bottom } = sheet.getBoundingClientRect()
        expect(bottom).toBeCloseTo(window.innerHeight, 0)
      })
      expect(within(sheet).queryByText('⌘')).toBe(null)
      expect(sheet.querySelector('kbd')).toBe(null)

      await userEvent.click(
        within(sheet).getByRole('button', { name: 'Move up' })
      )
      await waitFor(() =>
        expect(
          lastDoc(onValueChange).content!.map((b) => b.attrs!.blockId)
        ).toEqual(['support', 'doors', 'headliner'])
      )
      expect(sheet).toBeVisible()
      expect(
        within(sheet).getByRole('button', { name: 'Move up' })
      ).toBeDisabled()
    })

    it('turns a block into a heading from the sheet', async () => {
      await page.viewport(390, 700)
      const onValueChange = renderLineup()
      await userEvent.click(await row('Support'))
      await userEvent.click(await handle())
      const sheet = await screen.findByRole('dialog', { name: 'Paragraph' })

      await userEvent.click(
        within(sheet).getByRole('button', { name: 'Turn into' })
      )
      await userEvent.click(
        await within(sheet).findByRole('button', { name: 'Heading 3' })
      )

      await waitFor(() =>
        expect(lastDoc(onValueChange).content![1]).toMatchObject({
          type: 'heading',
          attrs: { level: 3, blockId: 'support' }
        })
      )
    })

    it('takes the lower half, under its block, with Delete last and Done to close', async () => {
      await page.viewport(390, 700)
      // Far enough down the page that the sheet would cover it.
      document.body.style.paddingBlock = '500px 900px'
      onTestFinished(() => {
        document.body.style.paddingBlock = ''
        window.scrollTo(0, 0)
      })
      renderLineup({ emphasis: 'normal' })
      const headliner = await row('Headliner')
      await userEvent.click(headliner)
      expect(headliner.getBoundingClientRect().top).toBeGreaterThan(350)
      await userEvent.click(await handle())
      const sheet = await screen.findByRole('dialog', { name: 'Paragraph' })

      await waitFor(() => {
        const { top } = sheet.getBoundingClientRect()
        expect(top).toBeGreaterThanOrEqual(window.innerHeight / 2 - 1)
        expect(headliner.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          top
        )
      })
      const rows = within(sheet)
        .getAllByRole('button')
        .map(
          (button) => button.textContent || button.getAttribute('aria-label')
        )
      expect(rows.at(-1)).toBe('Delete')
      expect(
        parseFloat(
          getComputedStyle(
            within(sheet).getByRole('button', { name: 'Duplicate' })
          ).fontWeight
        )
      ).toBeLessThan(600)

      await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    })

    it('makes room for the grip at the start of a subtler editor, and none at its end', async () => {
      await page.viewport(390, 700)
      renderLineup({ emphasis: 'subtler' })
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(await row('Doors'))
      const grip = (await handle()).getBoundingClientRect()
      const { paddingLeft, paddingRight } = getComputedStyle(textbox)

      expect(grip.left).toBeGreaterThanOrEqual(
        textbox.getBoundingClientRect().left
      )
      expect(parseFloat(paddingLeft)).toBeLessThanOrEqual(36)
      expect(paddingRight).toBe('0px')
    })

    it('keeps only the grip’s room at the start, and the frame’s own at the end', async () => {
      await page.viewport(390, 700)
      render(
        <Editor
          aria-label={LABEL}
          emphasis='normal'
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Doors' }]
                }
              ]
            }
          }}
        />
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(within(textbox).getByText('Doors'))
      await handle()

      const { paddingLeft, paddingRight } = getComputedStyle(textbox)

      expect(parseFloat(paddingLeft)).toBeGreaterThanOrEqual(30)
      expect(parseFloat(paddingLeft)).toBeLessThanOrEqual(36)
      expect(parseFloat(paddingRight)).toBeLessThan(parseFloat(paddingLeft))
      expect(screen.queryByRole('button', { name: 'Add block' })).toBe(null)
    })

    it('gives the grip a 44px target that ends at the text', async () => {
      await page.viewport(390, 700)
      renderLineup({ emphasis: 'normal' })
      await userEvent.click(await row('Support'))
      const grip = await handle()
      const text = (await row('Support')).getBoundingClientRect()

      await waitFor(() => {
        const box = grip.getBoundingClientRect()
        const middle = (box.top + box.bottom) / 2
        for (const [x, y] of [
          [text.left - 39, middle],
          [text.left - 2, middle],
          [(box.left + box.right) / 2, middle - 21],
          [(box.left + box.right) / 2, middle + 21]
        ] as const) {
          expect(document.elementFromPoint(x, y)?.closest('button')).toBe(grip)
        }
      })
    })
  })
})
