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

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'

const LABEL = 'Newsletter'
const POSTER = 'https://example.test/poster.webp'
const STAGE = 'https://example.test/stage.webp'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const VARIABLES: EditorVariable[] = [
  {
    key: 'view_url',
    label: 'View in browser',
    kind: 'url',
    tokens: { ae: '[ViewInBrowserLink]' }
  }
]

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  // The tests serve no images, so this stands in for a loaded one's size.
  style.textContent = `${roadieCss} [data-slot="editor-image"] img { block-size: 120px }`
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const image = (attrs: Record<string, unknown> = {}): JSONContent => ({
  type: 'image',
  attrs: { src: POSTER, alt: 'Festival poster', width: null, ...attrs }
})

const valueOf = (
  preset: EditorValue['preset'],
  ...content: JSONContent[]
): EditorValue => ({ version: 1, preset, doc: { type: 'doc', content } })

function renderImage(value = valueOf('email', image(), { type: 'paragraph' })) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={value}
      variables={VARIABLES}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const savedImage = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content![0]!.attrs

async function openSettings() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox.querySelector('img')!)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Image settings' })
  )
  const dialog = await screen.findByRole('dialog', { name: 'Image settings' })
  await waitFor(() => expect(dialog).toBeVisible())
  return dialog
}

describe('Editor image settings', () => {
  it('replaces the cryptic Aa with Image settings, and has no Save', async () => {
    renderImage()

    const dialog = await openSettings()

    for (const name of ['Image link', 'Link', 'Alt text']) {
      expect(within(dialog).getByRole('textbox', { name })).toBeVisible()
    }
    expect(
      within(dialog).getByRole('combobox', { name: 'Links to' })
    ).toBeVisible()
    expect(within(dialog).getByRole('group', { name: 'Width' })).toBeVisible()
    expect(within(dialog).getByRole('group', { name: 'Align' })).toBeVisible()
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Alt text' })).toBe(null)
  })

  it('sits a fitted image at its width, aligned, and full width again', async () => {
    const onValueChange = renderImage()
    const dialog = await openSettings()
    const align = within(dialog).getByRole('group', { name: 'Align' })
    expect(within(align).getByRole('button', { name: 'Right' })).toBeDisabled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Fit' }))
    await userEvent.click(within(align).getByRole('button', { name: 'Right' }))

    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({
        width: expect.any(Number),
        align: 'right'
      })
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Full' }))
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({ width: null })
    )
  })

  it('links the image to a whole address, or to a link variable', async () => {
    const onValueChange = renderImage()
    const dialog = await openSettings()

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Link' }),
      'oztix.com.au/ochre-kite-weekender'
    )
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({
        href: 'https://oztix.com.au/ochre-kite-weekender'
      })
    )

    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Links to' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'View in browser' })
    )
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({ variable: 'view_url' })
    )
    expect(savedImage(onValueChange)!.href).toBe(undefined)
  })

  it('swaps the image for another https one, and refuses any other', async () => {
    const onValueChange = renderImage()
    const dialog = await openSettings()
    const field = within(dialog).getByRole('textbox', { name: 'Image link' })

    await userEvent.clear(field)
    await userEvent.type(field, 'http://example.test/stage.webp')
    await userEvent.tab()
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(
      onValueChange.mock.calls.filter(
        ([value]) =>
          (value as EditorValue).doc.content![0]!.attrs!.src !== POSTER
      )
    ).toEqual([])

    await userEvent.clear(field)
    await userEvent.type(field, STAGE)
    expect(
      onValueChange.mock.calls.filter(
        ([value]) =>
          (value as EditorValue).doc.content![0]!.attrs!.src !== POSTER
      )
    ).toEqual([])
    await userEvent.tab()
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({ src: STAGE })
    )
  })

  it('puts the image back as it opened on Escape', async () => {
    const onValueChange = renderImage(
      valueOf('email', image({ href: TICKETS }), { type: 'paragraph' })
    )
    const dialog = await openSettings()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fit' }))
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Alt text' }),
      ' at dusk'
    )
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({
        alt: 'Festival poster at dusk'
      })
    )

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedImage(onValueChange)).toMatchObject({
      src: POSTER,
      alt: 'Festival poster',
      width: null,
      href: TICKETS
    })
  })

  it('focuses Alt text first on an image without any', async () => {
    renderImage(valueOf('email', image({ alt: '' }), { type: 'paragraph' }))

    const dialog = await openSettings()

    await waitFor(() =>
      expect(
        within(dialog).getByRole('textbox', { name: 'Alt text' })
      ).toHaveFocus()
    )
  })

  it('adds a new image from the Image control while one is selected', async () => {
    render(
      <Editor
        aria-label={LABEL}
        toolbar='docked'
        defaultValue={valueOf('rich', image({ src: '/images/crowd.webp' }), {
          type: 'paragraph'
        })}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox.querySelector('img')!)

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))

    expect(
      await screen.findByRole('textbox', { name: 'Image link' })
    ).toHaveValue('')
    expect(screen.queryByRole('dialog', { name: 'Image settings' })).toBe(null)
  })

  it('offers only the image link and alt text outside an email', async () => {
    renderImage(
      valueOf('rich', image({ src: '/images/crowd.webp' }), {
        type: 'paragraph'
      })
    )

    const dialog = await openSettings()

    expect(
      within(dialog)
        .getAllByRole('textbox')
        .map((field) => field.getAttribute('aria-label') ?? field.id)
    ).toHaveLength(2)
    expect(within(dialog).queryByRole('group', { name: 'Width' })).toBe(null)
    expect(within(dialog).queryByRole('textbox', { name: 'Link' })).toBe(null)
  })
})
