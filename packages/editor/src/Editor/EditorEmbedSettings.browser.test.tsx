import { render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  type EditorValue,
  type EmbedProvider,
  defaultEmbedProviders
} from '../schema'
import { MOD } from './testUtils'

const LABEL = 'Event page'
const SPOTIFY = 'https://open.spotify.com/track/exampleTrack0000000001'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

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

function renderPage() {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={page}
      embedProviders={localPlayers}
      onValueChange={onValueChange}
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

describe('Editor embed settings', () => {
  it('opens on a click, led by its title, a hint, and Done', async () => {
    renderPage()

    await userEvent.click(await player(), { force: true })

    const dialog = await screen.findByRole('dialog', { name: 'Embed settings' })
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
    await userEvent.click(await player(), { force: true })
    const dialog = await screen.findByRole('dialog', { name: 'Embed settings' })
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
})
