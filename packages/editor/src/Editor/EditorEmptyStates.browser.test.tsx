import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { clickIntoEditor } from './testUtils'

const LABEL = 'Page'
const BLOCKS_HINT = 'Type / to add a block'
const EMAIL_HINT = 'Type / for blocks, or pick a section'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const p = (text?: string): JSONContent =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }

const value = (
  preset: EditorValue['preset'],
  ...content: JSONContent[]
): EditorValue => ({ version: 1, preset, doc: { type: 'doc', content } })

const textbox = () => screen.findByRole('textbox', { name: LABEL })

const shownText = async (text: string) =>
  within(await textbox()).getByText(text)

const shownBefore = (element: Element) =>
  getComputedStyle(element, '::before').content

describe('Editor empty line hint', () => {
  it.each([
    ['blocks', BLOCKS_HINT],
    ['email', EMAIL_HINT]
  ] as const)(
    'shows on the focused empty line in the %s preset',
    async (preset, hint) => {
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={value(preset, p('Doors 7pm'))}
        />
      )
      await clickIntoEditor(await shownText('Doors 7pm'))

      await userEvent.keyboard('{End}{Enter}')

      const line = (await textbox()).children[1]!
      await waitFor(() => expect(shownBefore(line)).toBe(`"${hint}"`))
      expect(shownBefore((await textbox()).children[0]!)).toBe('none')

      ;(await textbox()).blur()
      await waitFor(() => expect(shownBefore(line)).toBe('none'))
    }
  )

  it('shows in an email section’s empty line', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={value('email', {
          type: 'section',
          content: [p('Doors 7pm'), p()]
        })}
      />
    )
    await clickIntoEditor(await shownText('Doors 7pm'))

    await userEvent.keyboard('{ArrowDown}')

    const line = (await textbox()).querySelector(
      '[data-type="section"] p:last-child'
    )!
    await waitFor(() => expect(shownBefore(line)).toBe(`"${EMAIL_HINT}"`))
  })

  it('shows on an empty blocks page before it has focus', async () => {
    render(<Editor aria-label={LABEL} preset='blocks' />)

    const line = (await textbox()).firstElementChild!
    await waitFor(() => expect(shownBefore(line)).toBe(`"${BLOCKS_HINT}"`))
  })

  it('gives way to the placeholder prop, which shows only while empty', async () => {
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        placeholder='Tell people about the night'
      />
    )
    const first = (await textbox()).firstElementChild!
    await waitFor(() =>
      expect(shownBefore(first)).toBe('"Tell people about the night"')
    )
    await clickIntoEditor(first)

    await userEvent.keyboard('Doors 7pm{Enter}')

    const line = (await textbox()).children[1]!
    await waitFor(() => expect(line.tagName).toBe('P'))
    expect(shownBefore(line)).toBe('none')
  })

  it.each(['basic', 'rich'] as const)(
    'shows no hint in the %s preset',
    async (preset) => {
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={value(preset, p('Doors 7pm'))}
        />
      )
      await clickIntoEditor(await shownText('Doors 7pm'))

      await userEvent.keyboard('{End}{Enter}')

      const line = (await textbox()).children[1]!
      await waitFor(() => expect(line.tagName).toBe('P'))
      expect(shownBefore(line)).toBe('none')
    }
  )
})

describe('Editor empty email', () => {
  function renderEmail(props: Partial<EditorProps> = {}) {
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        preset='email'
        onValueChange={onValueChange}
        {...props}
      />
    )
    return onValueChange
  }

  const start = () => screen.findByRole('group', { name: 'Start your email' })

  it('offers Sections, Blocks and Import', async () => {
    renderEmail()

    const actions = within(await start()).getAllByRole('button')

    expect(actions.map((action) => action.textContent)).toEqual([
      'Sections',
      'Blocks',
      'Import'
    ])
    expect(shownBefore((await textbox()).firstElementChild!)).toBe(
      `"${EMAIL_HINT}"`
    )
  })

  it.each([
    ['Sections', 'Header'],
    ['Blocks', 'Paragraph']
  ])('opens the Blocks drawer at %s', async (name, first) => {
    renderEmail()

    await userEvent.click(within(await start()).getByRole('button', { name }))

    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: first })).toHaveFocus()
    )
  })

  it('adds the section picked in place of the empty line', async () => {
    const onValueChange = renderEmail()

    await userEvent.click(
      within(await start()).getByRole('button', { name: 'Sections' })
    )
    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Header' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content![0]
      ).toMatchObject({ type: 'section' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Start your email' })).toBe(
        null
      )
    )
  })

  it('goes once an empty section is added, with one hint, in the section', async () => {
    renderEmail()

    await userEvent.click(
      within(await start()).getByRole('button', { name: 'Blocks' })
    )
    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Section' })
    )

    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Start your email' })).toBe(
        null
      )
    )
    const section = (await textbox()).querySelector('[data-type="section"]')!
    await waitFor(() =>
      expect(shownBefore(section.querySelector('p')!)).toBe(`"${EMAIL_HINT}"`)
    )
    expect(shownBefore(section)).toBe('none')
  })

  it('opens Import', async () => {
    renderEmail()

    await userEvent.click(
      within(await start()).getByRole('button', { name: 'Import' })
    )

    expect(
      await screen.findByRole('dialog', { name: 'Import HTML or MJML' })
    ).toBeInTheDocument()
  })

  it('goes once the email has content', async () => {
    renderEmail()
    await start()
    await clickIntoEditor(await textbox())

    await userEvent.keyboard('Hi')

    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Start your email' })).toBe(
        null
      )
    )
  })

  it.each([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }]
  ])('shows nothing to start with when %s', async (_, props) => {
    renderEmail(props)
    await textbox()

    expect(screen.queryByRole('group', { name: 'Start your email' })).toBe(null)
  })
})
