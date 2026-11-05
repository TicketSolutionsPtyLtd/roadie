import { render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorSection } from '../extensions'
import { renderEditorValue } from '../render'
import type { EditorValue } from '../schema'
import { clickIntoEditor } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

const thumbnail = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16"><rect width="24" height="16" fill="${fill}"/></svg>`
  )}`

const promo: EditorSection = {
  name: 'promo',
  label: 'Promo',
  attrs: { title: 'Ochre Kite Weekender', tone: 'calm' },
  settings: [
    { name: 'title', label: 'Title', type: 'text' },
    {
      name: 'tone',
      label: 'Tone',
      type: 'choice',
      options: [
        { value: 'calm', label: 'Calm' },
        { value: 'loud', label: 'Loud' }
      ]
    },
    {
      name: 'shout',
      label: 'Shout',
      type: 'text',
      available: (attrs) => attrs.tone === 'loud'
    }
  ],
  render: ({ attrs }) => (
    <aside data-tone={String(attrs.tone)}>
      <h2>{String(attrs.title)}</h2>
      <a href='/events/ochre-kite-weekender'>Get tickets</a>
    </aside>
  ),
  templates: [
    {
      label: 'Calm promo',
      thumbnail: thumbnail('#eaf1f7'),
      keywords: ['banner']
    },
    {
      label: 'Loud promo',
      thumbnail: thumbnail('#0191eb'),
      keywords: ['banner'],
      attrs: { tone: 'loud' }
    }
  ]
}

const page = (...content: object[]): EditorValue => ({
  version: 1,
  preset: 'blocks',
  doc: { type: 'doc', content }
})

const intro = {
  type: 'paragraph',
  attrs: { blockId: 'intro' },
  content: [{ type: 'text', text: 'Doors 7pm' }]
}

function renderPage(value = page(intro), props = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      sections={[promo]}
      defaultValue={value}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const saved = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!

async function clickInto(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(within(textbox).getByText(text))
}

describe('Editor sections', () => {
  it('lists each template under Sections in the insert menu, with its thumbnail', async () => {
    renderPage()
    await clickInto('Doors 7pm')

    await userEvent.keyboard('{End}{Enter}/banner')

    const sections = await screen.findByRole('group', { name: 'Sections' })
    const options = within(sections).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Calm promo',
      'Loud promo'
    ])
    expect(options[1]!.querySelector('img')).toHaveAttribute(
      'src',
      thumbnail('#0191eb')
    )
  })

  it('adds a section as the page renders it, starting from its template', async () => {
    const onValueChange = renderPage()
    await clickInto('Doors 7pm')

    await userEvent.keyboard('{End}{Enter}/loud{Enter}')

    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const heading = await within(textbox).findByRole('heading', {
      name: 'Ochre Kite Weekender',
      hidden: true
    })
    expect(heading.closest('aside')).toHaveAttribute('data-tone', 'loud')
    await waitFor(() =>
      expect(saved(onValueChange)[1]).toMatchObject({
        type: 'promo',
        attrs: {
          title: 'Ochre Kite Weekender',
          tone: 'loud',
          blockId: expect.any(String)
        }
      })
    )
  })

  it('keeps a section’s own links out of reach while editing', async () => {
    renderPage(page(intro, { type: 'promo', attrs: { blockId: 'promo' } }))

    const link = await screen.findByRole('link', { name: 'Get tickets' })
    link.focus()

    expect(link).not.toHaveFocus()
  })

  it('adds a section from its tile in the Blocks drawer', async () => {
    const onValueChange = renderPage(page(intro), { toolbar: 'docked' })
    await clickInto('Doors 7pm')

    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Blocks' }))
    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    const sections = within(drawer).getByRole('group', { name: 'Sections' })
    const tile = within(sections).getByRole('button', { name: 'Calm promo' })
    expect(tile.querySelector('img')).toHaveAttribute(
      'src',
      thumbnail('#eaf1f7')
    )
    await userEvent.click(tile)

    await waitFor(() =>
      expect(saved(onValueChange)[1]).toMatchObject({
        type: 'promo',
        attrs: { tone: 'calm' }
      })
    )
  })

  it('edits a section in its Settings drawer, showing only what applies', async () => {
    renderPage(page(intro, { type: 'promo', attrs: { blockId: 'promo' } }))
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByRole('group', { name: 'Promo' }))
    await userEvent.keyboard('{Enter}')

    const drawer = await screen.findByRole('dialog', {
      name: 'Promo settings'
    })
    expect(within(drawer).queryByRole('textbox', { name: 'Shout' })).toBe(null)
    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )
    await userEvent.click(within(drawer).getByRole('button', { name: 'Loud' }))

    expect(
      within(textbox).getByRole('heading', { hidden: true })
    ).toHaveTextContent('Ochre Kite Weekender!')
    expect(within(drawer).getByRole('textbox', { name: 'Shout' })).toBeVisible()
  })

  it('renders a saved section through /render with its own renderer', () => {
    const value = page({
      type: 'promo',
      attrs: { title: 'Kazoo Hollow', tone: 'calm' }
    })

    expect(
      renderToString(
        renderEditorValue(value, { nodeMapping: { promo: promo.render } })
      )
    ).toContain('<h2>Kazoo Hollow</h2>')
  })

  it('shows a section it can’t render as a message, not a broken page', async () => {
    const broken: EditorSection = {
      ...promo,
      render: ({ attrs }) => {
        if (attrs.title === 'boom') throw new Error('Unreadable section')
        return <h2>{String(attrs.title)}</h2>
      }
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Editor
        aria-label={LABEL}
        sections={[broken]}
        defaultValue={page(intro, { type: 'promo', attrs: { title: 'boom' } })}
      />
    )

    // Tiptap mounts a node view's React tree again once the view is ready.
    await waitFor(() =>
      expect(screen.getByText('This section can’t be shown.')).toBeVisible()
    )
    expect(screen.getByText('Doors 7pm')).toBeVisible()
    consoleError.mockRestore()
  })
})
