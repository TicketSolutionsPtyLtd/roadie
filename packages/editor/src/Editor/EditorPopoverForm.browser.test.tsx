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

const MOD = /^(Mac|iP)/.test(navigator.platform) ? 'Meta' : 'Control'
const LABEL = 'Event description'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'
const CROWD_ALT = 'The crowd at sunset'
const SPOTIFY = 'https://open.spotify.com/track/exampleTrack0000000001'

// The tests serve no images, so this stands in for a loaded one's size.
const IMAGE_SIZE =
  '[data-slot="editor-image"] img { inline-size: 320px; block-size: 180px }'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss}\n${IMAGE_SIZE}`
  document.head.append(style)
})
afterAll(() => style.remove())

// Players point at this server, so the tests load nothing from the internet.
const localPlayers: EmbedProvider[] = defaultEmbedProviders.map((provider) => ({
  ...provider,
  src: ({ id }) => `/embed-test/${provider.name}/${id}`
}))

const SOLD_OUT = {
  type: 'paragraph',
  content: [{ type: 'text', text: 'Sold out' }]
}

const withDoc = (...content: unknown[]): EditorValue =>
  ({
    version: 1,
    preset: 'rich',
    doc: { type: 'doc', content }
  }) as EditorValue

const soldOut = withDoc(SOLD_OUT)
const pictured = withDoc(
  { type: 'image', attrs: { src: '/images/crowd.webp', alt: '' } },
  SOLD_OUT
)
const youtube = withDoc(
  { type: 'embed', attrs: { provider: 'youtube', id: 'exampleVid1' } },
  SOLD_OUT
)
const linked = withDoc({
  type: 'paragraph',
  content: [
    { type: 'text', text: 'Get ' },
    {
      type: 'text',
      marks: [{ type: 'link', attrs: { href: TICKETS } }],
      text: 'tickets'
    }
  ]
})

function renderEditor(
  defaultValue: EditorValue,
  onValueChange?: (value: EditorValue) => void
) {
  render(
    <Editor
      aria-label={LABEL}
      preset='rich'
      embedProviders={localPlayers}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
  return screen.findByRole('textbox', { name: LABEL })
}

async function openField(name: string) {
  const field = await screen.findByRole('textbox', { name })
  await waitFor(() => expect(field).toHaveFocus())
  return field
}

type Popover = {
  name: string
  placeholder: string
  value: EditorValue
  open: (textbox: HTMLElement) => Promise<HTMLElement>
  typed: string
  submitLabel: string
  saved: (textbox: HTMLElement) => Promise<unknown>
}

const POPOVERS: Popover[] = [
  {
    name: 'Link',
    placeholder: 'Paste a link',
    value: soldOut,
    async open(textbox) {
      await userEvent.click(textbox)
      await waitFor(() => expect(textbox).toHaveFocus())
      await userEvent.keyboard(
        '{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}'
      )
      await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
      return openField('Link')
    },
    typed: TICKETS,
    submitLabel: 'Save link',
    saved: (textbox) => within(textbox).findByRole('link', { name: 'Sold' })
  },
  {
    name: 'Embed',
    placeholder: 'Paste a video or audio link',
    value: soldOut,
    async open(textbox) {
      await userEvent.click(within(textbox).getByText('Sold out'))
      await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
      return openField('Video or audio link')
    },
    typed: SPOTIFY,
    submitLabel: 'Embed link',
    saved: (textbox) =>
      within(textbox).findByTitle('Spotify embed exampleTrack0000000001')
  },
  {
    name: 'Edit link',
    placeholder: 'Paste a video or audio link',
    value: youtube,
    async open(textbox) {
      const player = await within(textbox).findByTitle(/embed/)
      await userEvent.click(player, { force: true })
      await userEvent.click(
        await screen.findByRole('button', { name: 'Edit link' })
      )
      const field = await openField('Video or audio link')
      await userEvent.clear(field)
      return field
    },
    typed: SPOTIFY,
    submitLabel: 'Save link',
    saved: (textbox) =>
      within(textbox).findByTitle('Spotify embed exampleTrack0000000001')
  },
  {
    name: 'Alt text',
    placeholder: 'Describe the image',
    value: pictured,
    async open(textbox) {
      await userEvent.click(textbox.querySelector('img')!)
      await userEvent.keyboard('{Enter}')
      return openField('Alt text')
    },
    typed: CROWD_ALT,
    submitLabel: 'Save alt text',
    saved: (textbox) => within(textbox).findByRole('img', { name: CROWD_ALT })
  }
]

function enterWhileComposing(
  field: HTMLElement,
  init: { isComposing?: boolean; keyCode?: number }
) {
  field.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      ...init
    })
  )
}

describe.each(POPOVERS)('Editor $name popover', (popover) => {
  it('saves on Enter', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)

    await userEvent.type(field, `${popover.typed}{Enter}`)

    expect(await popover.saved(textbox)).toBeVisible()
    await waitFor(() => expect(field).not.toBeInTheDocument())
  })

  it('saves with the check button at the end of the field, and has no text buttons', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)
    const popup = field.closest<HTMLElement>('[data-slot="popover-popup"]')!
    const check = within(popup).getByRole('button', {
      name: popover.submitLabel
    })

    for (const button of within(popup).getAllByRole('button')) {
      expect(button.textContent.trim()).toBe('')
    }
    expect(check.getBoundingClientRect().left).toBeGreaterThan(
      field.getBoundingClientRect().right - 1
    )
    expect(check.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      field.getBoundingClientRect().top - 8
    )
    expect(check.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      field.getBoundingClientRect().bottom + 8
    )

    await userEvent.type(field, popover.typed)
    await userEvent.click(check)

    expect(await popover.saved(textbox)).toBeVisible()
  })

  it('ignores the Enter that ends an IME composition', async () => {
    const onValueChange = vi.fn()
    const textbox = await renderEditor(popover.value, onValueChange)
    const field = await popover.open(textbox)
    await userEvent.type(field, popover.typed)

    enterWhileComposing(field, { isComposing: true })
    enterWhileComposing(field, { keyCode: 229 })

    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(await popover.saved(textbox)).toBeVisible()
  })
})

const popupOf = (field: HTMLElement) =>
  field.closest<HTMLElement>('[data-slot="popover-popup"]')!

const centreY = (element: Element) => {
  const { top, height } = element.getBoundingClientRect()
  return top + height / 2
}

const px = (value: string) => Number.parseFloat(value)

describe.each(POPOVERS)('Editor $name popover row', (popover) => {
  it('is one row of the input, a separator, then the check and close buttons', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)
    const popup = popupOf(field)
    const separator = within(popup).getByRole('separator')
    const check = within(popup).getByRole('button', {
      name: popover.submitLabel
    })
    const close = within(popup).getByRole('button', { name: 'Close' })

    expect(field).toHaveAttribute('placeholder', popover.placeholder)
    expect(popup.querySelector('label')).toBe(null)
    for (const part of [separator, check, close]) {
      expect(Math.abs(centreY(part) - centreY(field))).toBeLessThanOrEqual(1)
    }
    expect(separator.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      field.getBoundingClientRect().right - 1
    )
    expect(check.getBoundingClientRect().left).toBeGreaterThan(
      separator.getBoundingClientRect().right - 1
    )
    expect(close.getBoundingClientRect().left).toBeGreaterThan(
      check.getBoundingClientRect().right - 1
    )
    const style = getComputedStyle(popup)
    const chrome =
      px(style.paddingTop) +
      px(style.paddingBottom) +
      px(style.borderTopWidth) +
      px(style.borderBottomWidth)
    // Layout sizes, since the popup scales in as it opens.
    expect(
      Math.abs(popup.offsetHeight - chrome - check.offsetHeight)
    ).toBeLessThanOrEqual(1)
  })

  it('draws no frame, fill, or focus ring on the focused input', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)

    for (const element of [field, field.parentElement!]) {
      const style = getComputedStyle(element)
      expect(px(style.borderTopWidth)).toBe(0)
      expect(px(style.borderInlineStartWidth)).toBe(0)
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(
        style.outlineStyle === 'none' || px(style.outlineWidth) === 0
      ).toBe(true)
      expect(style.boxShadow).toBe('none')
    }
  })

  it('makes the buttons subtler and the same size as each other', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)
    const buttons = within(popupOf(field)).getAllByRole('button')
    const [first] = buttons

    for (const button of buttons) {
      expect(button.className).toContain('emphasis-subtler')
      expect(button.getBoundingClientRect().height).toBe(
        first!.getBoundingClientRect().height
      )
    }
  })

  it('keeps the check focusable but disabled while the input is empty', async () => {
    const onValueChange = vi.fn()
    const textbox = await renderEditor(popover.value, onValueChange)
    const field = await popover.open(textbox)
    await userEvent.clear(field)
    const check = screen.getByRole('button', { name: popover.submitLabel })

    expect(check).toHaveAttribute('aria-disabled', 'true')
    check.focus()
    expect(check).toHaveFocus()
    await userEvent.click(check, { force: true })
    field.focus()
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(field).toBeInTheDocument()
    expect(field).not.toHaveAttribute('aria-invalid')

    await userEvent.type(field, popover.typed)
    expect(check).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('closes with the close button, putting focus back in the editor', async () => {
    const onValueChange = vi.fn()
    const textbox = await renderEditor(popover.value, onValueChange)
    const field = await popover.open(textbox)
    await userEvent.type(field, popover.typed)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(field).not.toBeInTheDocument())
    await waitFor(() => expect(textbox).toHaveFocus())
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('closes with Escape', async () => {
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(field).not.toBeInTheDocument())
    await waitFor(() => expect(textbox).toHaveFocus())
  })
})

describe('Editor link popover', () => {
  it('puts the selection back when the close button closes it', async () => {
    const textbox = await renderEditor(soldOut)
    await POPOVERS[0]!.open(textbox)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(textbox).toHaveFocus())
    expect(document.getSelection()?.toString()).toBe('Sold')
  })

  it('shows Remove link between the check and close buttons', async () => {
    const textbox = await renderEditor(linked)
    await userEvent.click(within(textbox).getByText('tickets'))
    await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
    const field = await openField('Link')

    expect(
      within(popupOf(field))
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Save link', 'Remove link', 'Close'])
  })

  it('removes an existing link with Remove link', async () => {
    const textbox = await renderEditor(linked)
    await userEvent.click(within(textbox).getByText('tickets'))
    await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
    await openField('Link')

    await userEvent.click(screen.getByRole('button', { name: 'Remove link' }))

    await waitFor(() => expect(within(textbox).queryByRole('link')).toBe(null))
    expect(textbox).toHaveTextContent('Get tickets')
  })

  it('offers Remove link only for an existing link', async () => {
    const textbox = await renderEditor(soldOut)
    await POPOVERS[0]!.open(textbox)

    expect(screen.queryByRole('button', { name: 'Remove link' })).toBe(null)
  })
})

describe.each([
  ['Link', 0, 'not a web address', /web address/],
  ['Embed', 1, 'https://www.instagram.com/p/C1a2b3c4d5e/', /can’t be embedded/]
] as const)('Editor %s popover refusing', (_, index, typed, error) => {
  it('shows the error and keeps focus in the field after the check button', async () => {
    const popover = POPOVERS[index]!
    const textbox = await renderEditor(popover.value)
    const field = await popover.open(textbox)
    await userEvent.type(field, typed)

    await userEvent.click(
      screen.getByRole('button', { name: popover.submitLabel })
    )

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(error)
    expect(within(popupOf(field)).getByRole('alert').textContent).toMatch(error)
    expect(field).toHaveFocus()
  })
})

const YOUTUBE = 'https://www.youtube.com/watch?v=exampleVid1'

const PREFILLED = [
  {
    name: 'Edit link on an embed',
    value: youtube,
    saved: YOUTUBE,
    async open(textbox: HTMLElement) {
      const player = await within(textbox).findByTitle(/embed/)
      await userEvent.click(player, { force: true })
      await userEvent.click(
        await screen.findByRole('button', { name: 'Edit link' })
      )
      return openField('Video or audio link')
    }
  },
  {
    name: `${MOD}+K on a link`,
    value: linked,
    saved: TICKETS,
    async open(textbox: HTMLElement) {
      await userEvent.click(within(textbox).getByText('tickets'))
      await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
      return openField('Link')
    }
  },
  {
    name: 'the Link control on a link',
    value: linked,
    saved: TICKETS,
    async open(textbox: HTMLElement) {
      await userEvent.click(within(textbox).getByText('tickets'))
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      return openField('Link')
    }
  },
  {
    name: 'Alt text on an image with alt',
    value: withDoc(
      { type: 'image', attrs: { src: '/images/crowd.webp', alt: CROWD_ALT } },
      SOLD_OUT
    ),
    saved: CROWD_ALT,
    async open(textbox: HTMLElement) {
      await userEvent.click(textbox.querySelector('img')!)
      await userEvent.keyboard('{Enter}')
      return openField('Alt text')
    }
  }
]

describe.each(PREFILLED)('Editor popover opened by $name', (popover) => {
  it('selects the saved value, so typing replaces it', async () => {
    const textbox = await renderEditor(popover.value)
    const field = (await popover.open(textbox)) as HTMLInputElement

    expect(field).toHaveValue(popover.saved)
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(popover.saved.length)

    await userEvent.keyboard('x')
    expect(field).toHaveValue('x')
  })

  it('places the caret where a later click lands', async () => {
    const textbox = await renderEditor(popover.value)
    const field = (await popover.open(textbox)) as HTMLInputElement
    await userEvent.keyboard('{End}')
    screen.getByRole('button', { name: 'Close' }).focus()

    await userEvent.click(field)

    expect(field).toHaveFocus()
    expect(field.selectionStart).toBe(field.selectionEnd)
  })
})
