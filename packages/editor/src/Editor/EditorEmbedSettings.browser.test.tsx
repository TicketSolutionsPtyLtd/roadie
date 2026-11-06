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
  onTestFinished,
  vi
} from 'vitest'
import { userEvent, page as viewport } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  type EditorValue,
  type EmbedProvider,
  defaultEmbedProviders
} from '../schema'
import { MOD, clickIntoEditor } from './testUtils'

const LABEL = 'Event page'
const SPOTIFY = 'https://open.spotify.com/track/exampleTrack0000000001'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())
// The settings portal to the body, so React unmounts them before it empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

// Players point at this server, so the tests load nothing from the internet.
const localPlayers: EmbedProvider[] = defaultEmbedProviders.map((provider) => ({
  ...provider,
  src: ({ id }) => `/embed-test/${provider.name}/${id}`
}))

const page: EditorValue = {
  version: 1,
  preset: 'blocks',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'embed',
        attrs: { blockId: 'trailer', provider: 'youtube', id: 'exampleVid1' }
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
}

function renderPage(props: Partial<React.ComponentProps<typeof Editor>> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={page}
      embedProviders={localPlayers}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

const savedEmbed = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content![0]!.attrs

async function player() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  return within(textbox).findByTitle(/embed/)
}

// A click selects the embed, and its toolbar leads with its settings.
async function openSettings() {
  await userEvent.click(await player(), { force: true })
  await userEvent.click(
    await screen.findByRole('button', { name: 'Embed settings' })
  )
  const dialog = await screen.findByRole('dialog', { name: 'Embed settings' })
  await waitFor(() => expect(dialog).toBeVisible())
  return dialog
}

describe('Editor embed settings', () => {
  it('selects on a click, its toolbar led by Embed settings', async () => {
    renderPage()

    await userEvent.click(await player(), { force: true })

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Embed actions'
    })
    expect(
      within(toolbar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Embed settings', 'Remove embed'])
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  it('opens led by its title, a hint, and Done', async () => {
    renderPage()

    const dialog = await openSettings()
    expect(dialog).toHaveTextContent(
      'Changes apply as you go. Undo puts them back.'
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
  })

  it('leads the embed’s block menu with Settings, which opens them', async () => {
    renderPage()
    await userEvent.hover(await player(), { force: true })
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block actions' })
    )

    const menu = await screen.findByRole('menu')
    const first = within(menu).getAllByRole('menuitem')[0]!
    expect(first).toHaveTextContent('Settings')
    await userEvent.click(first)

    const dialog = await screen.findByRole('dialog', { name: 'Embed settings' })
    await waitFor(() => expect(dialog).toBeVisible())
  })

  it('keeps a new link on Escape, which undo puts back', async () => {
    const onValueChange = renderPage()
    const dialog = await openSettings()
    const field = within(dialog).getByRole('textbox', {
      name: 'Video or audio link'
    })
    await userEvent.clear(field)
    await userEvent.type(field, SPOTIFY)
    await waitFor(() =>
      expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'spotify' })
    )

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'spotify' })
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'youtube' })
    )
  })

  it('edits the link in a field of its own, closed only by Done', async () => {
    const onValueChange = renderPage()
    const dialog = await openSettings()

    const field = within(dialog).getByRole('textbox', {
      name: 'Video or audio link'
    })
    expect(field).toHaveValue('https://www.youtube.com/watch?v=exampleVid1')
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Done'])

    await userEvent.clear(field)
    await userEvent.type(field, `${SPOTIFY}{Enter}`)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'spotify' })
  })

  it('puts the player back once what’s typed stops embedding', async () => {
    const onValueChange = renderPage()
    const dialog = await openSettings()
    const field = within(dialog).getByRole('textbox', {
      name: 'Video or audio link'
    })
    await userEvent.clear(field)
    await userEvent.type(field, SPOTIFY)
    await waitFor(() =>
      expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'spotify' })
    )

    await userEvent.keyboard('{Backspace}')

    await waitFor(() =>
      expect(savedEmbed(onValueChange)).toMatchObject({ provider: 'youtube' })
    )
  })

  it('opens on Enter with the embed selected', async () => {
    renderPage()
    await player()
    await clickIntoEditor(screen.getByText('Doors 7pm'))

    await userEvent.keyboard('{ArrowUp}{Enter}')

    const dialog = await screen.findByRole('dialog', { name: 'Embed settings' })
    await waitFor(() => expect(dialog).toBeVisible())
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveTextContent(
      'Doors 7pm'
    )
  })

  it('opens from the bottom on a phone, and from Settings on its docked bar', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage({ toolbar: 'docked' })
    await player()
    await clickIntoEditor(screen.getByText('Doors 7pm'))
    await userEvent.keyboard('{ArrowUp}')
    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })

    await userEvent.click(
      await within(bar).findByRole('button', { name: 'Settings' })
    )

    const sheet = await screen.findByRole('dialog', { name: 'Embed settings' })
    await waitFor(() =>
      expect(sheet.getBoundingClientRect().bottom).toBeCloseTo(
        window.innerHeight,
        0
      )
    )
    expect(sheet.getBoundingClientRect().left).toBeLessThanOrEqual(1)
  })
})
