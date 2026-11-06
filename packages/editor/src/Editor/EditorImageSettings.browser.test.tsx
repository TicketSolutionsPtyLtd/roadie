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
import { page, userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { LINE_END, MOD, clickIntoEditor } from './testUtils'

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

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
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

// A click opens them where the editor has a block menu; elsewhere, the
// image's toolbar does.
async function openSettings({ fromToolbar = false } = {}) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox.querySelector('img')!)
  if (fromToolbar) {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Image settings' })
    )
  }
  const dialog = await screen.findByRole('dialog', { name: 'Image settings' })
  await waitFor(() => expect(dialog).toBeVisible())
  return dialog
}

// Past the moment a click's settings would open.
const expectNoSettings = () =>
  expect(
    waitFor(() => expect(screen.queryByRole('dialog')).not.toBe(null), {
      timeout: 300
    })
  ).rejects.toThrow()

describe('Editor image settings', () => {
  it('opens on a click, led by its title, a hint, and Done, which keeps the changes', async () => {
    const onValueChange = renderImage()

    const dialog = await openSettings()

    const title = within(dialog).getByRole('heading', {
      name: 'Image settings'
    })
    // By class, as the test sheet compiles no text alignment to measure.
    expect(title.closest('[data-slot="popover-header"]')).toHaveClass(
      'text-start'
    )
    expect(dialog).toHaveTextContent(
      'Changes apply as you go. Undo puts them back.'
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fit' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(savedImage(onValueChange)).toMatchObject({
      width: expect.any(Number)
    })
  })

  it('leads the image’s block menu with Settings, which opens them', async () => {
    renderImage()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.hover(textbox.querySelector('img')!)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block actions' })
    )

    const menu = await screen.findByRole('menu')
    const first = within(menu).getAllByRole('menuitem')[0]!
    expect(first).toHaveTextContent('Settings')
    await userEvent.click(first)

    const dialog = await screen.findByRole('dialog', { name: 'Image settings' })
    await waitFor(() => expect(dialog).toBeVisible())
  })

  it('has every field, and no Save', async () => {
    renderImage()

    const dialog = await openSettings()
    expect(dialog).toHaveAttribute('data-editor-popup')

    for (const name of ['Image address', 'Link', 'Alt text']) {
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
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Full width' })
    )
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
    const field = within(dialog).getByRole('textbox', { name: 'Image address' })

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

  it('keeps the changes on Escape, which undo puts back in one step and redo restores', async () => {
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
    const edited = {
      alt: 'Festival poster at dusk',
      width: expect.any(Number),
      href: TICKETS
    }
    expect(savedImage(onValueChange)).toMatchObject(edited)

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({
        src: POSTER,
        alt: 'Festival poster',
        width: null,
        href: TICKETS
      })
    )
    await userEvent.keyboard(`{${MOD}>}{Shift>}z{/Shift}{/${MOD}}`)
    await waitFor(() => expect(savedImage(onValueChange)).toMatchObject(edited))
  })

  it('focuses the first style choice, where no keyboard comes up', async () => {
    renderImage(valueOf('email', image({ alt: '' }), { type: 'paragraph' }))

    const dialog = await openSettings()

    const width = within(dialog).getByRole('group', { name: 'Width' })
    await waitFor(() =>
      expect(
        within(width).getByRole('button', { name: 'Full width' })
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
      await screen.findByRole('textbox', { name: 'Image address' })
    ).toHaveValue('')
    expect(screen.queryByRole('dialog', { name: 'Image settings' })).toBe(null)
  })

  it('sets a page image’s width, alignment and caption, with no link', async () => {
    const onValueChange = renderImage(
      valueOf('rich', image({ src: '/images/crowd.webp' }), {
        type: 'paragraph'
      })
    )
    const dialog = await openSettings({ fromToolbar: true })
    expect(within(dialog).queryByRole('textbox', { name: 'Link' })).toBe(null)

    const align = within(dialog).getByRole('group', { name: 'Align' })
    await userEvent.click(within(align).getByRole('button', { name: 'Centre' }))
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Caption' }),
      'Gates 11am'
    )
    await waitFor(() =>
      expect(savedImage(onValueChange)).toEqual({
        src: '/images/crowd.webp',
        alt: 'Festival poster',
        align: 'center',
        caption: 'Gates 11am'
      })
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Full width' })
    )

    await waitFor(() =>
      expect(savedImage(onValueChange)).toEqual({
        src: '/images/crowd.webp',
        alt: 'Festival poster',
        fullWidth: true,
        caption: 'Gates 11am'
      })
    )
    expect(within(align).getByRole('button', { name: 'Right' })).toBeDisabled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Fit' }))
    await waitFor(() =>
      expect(savedImage(onValueChange)).toMatchObject({ align: 'center' })
    )
  })

  it('edits an image that isn’t the first block', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueOf(
          'rich',
          p('Doors 7pm'),
          image({ src: '/images/crowd.webp' })
        )}
      />
    )

    const dialog = await openSettings({ fromToolbar: true })

    expect(within(dialog).getByRole('group', { name: 'Align' })).toBeVisible()
  })

  it('opens on a tap only on an image already selected', async () => {
    renderImage()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const img = textbox.querySelector('img')!
    const tap = () => {
      img.dispatchEvent(
        new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })
      )
      img.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    }

    tap()
    await expectNoSettings()

    await userEvent.click(textbox.querySelector('p')!)
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() =>
      expect(
        textbox.querySelector('[data-slot="editor-image"]')
      ).toHaveAttribute('data-selected')
    )
    tap()
    expect(
      await screen.findByRole('dialog', { name: 'Image settings' })
    ).toBeInTheDocument()
  })

  it('leaves a Shift-click to the selection', async () => {
    renderImage()
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    await userEvent.click(textbox.querySelector('img')!, {
      modifiers: ['Shift']
    })

    await expectNoSettings()
  })

  it('offers no Left for a page image in right-to-left text, which can’t save one', async () => {
    render(
      <div dir='rtl'>
        <Editor
          aria-label={LABEL}
          defaultValue={valueOf('rich', image({ src: '/images/crowd.webp' }), {
            type: 'paragraph'
          })}
        />
      </div>
    )

    const dialog = await openSettings({ fromToolbar: true })

    const align = within(dialog).getByRole('group', { name: 'Align' })
    expect(
      within(align)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Centre', 'Right'])
    expect(
      within(align).getByRole('button', { name: 'Right' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('names its choices as Button settings does', async () => {
    renderImage(valueOf('email', image({ width: 200 }), { type: 'paragraph' }))
    const dialog = await openSettings()

    const names = (group: string) =>
      within(within(dialog).getByRole('group', { name: group }))
        .getAllByRole('button')
        .map((button) => button.textContent)
    expect(names('Width')).toEqual(['Fit', 'Full width'])
    expect(names('Align')).toEqual(['Left', 'Centre', 'Right'])
    expect(
      within(dialog).getByRole('textbox', { name: 'Image address' })
    ).toBeVisible()
  })

  it('flags a selected image without alt text on an opaque chip', async () => {
    renderImage(valueOf('email', image({ alt: '' }), { type: 'paragraph' }))
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox.querySelector('img')!)

    const flag = await within(textbox).findByText('No alt text')
    const chip = flag.closest<HTMLElement>('[data-slot="badge"]') ?? flag
    const fill = getComputedStyle(chip).backgroundColor
    expect(fill).not.toMatch(/transparent|, 0(\.\d+)?\)$/)
  })

  it('opens from the bottom on a phone', async () => {
    await page.viewport(390, 700)
    try {
      renderImage()
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(textbox.querySelector('img')!)

      const sheet = await screen.findByRole('dialog', {
        name: 'Image settings'
      })
      await waitFor(() =>
        expect(sheet.getBoundingClientRect().bottom).toBeCloseTo(
          window.innerHeight,
          0
        )
      )
      expect(sheet.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
      await waitFor(() =>
        expect(sheet.contains(document.activeElement)).toBe(true)
      )
      // A choice, as a field's keyboard would cover the sheet.
      expect(document.activeElement).toHaveAttribute('aria-pressed', 'true')
      expect(sheet).toHaveAttribute('data-editor-popup')
      // Half the screen, with the image above it and the page unblurred.
      const image = textbox.querySelector('img')!
      await waitFor(() =>
        expect(image.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          sheet.getBoundingClientRect().top + 1
        )
      )
      expect(sheet.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        window.innerHeight / 2 - 1
      )
      const backdrop = document.querySelector('[data-slot="drawer-backdrop"]')
      if (backdrop) {
        expect(getComputedStyle(backdrop).backdropFilter).toBe('none')
      }
    } finally {
      await page.viewport(1280, 800)
    }
  })

  it.each([
    [
      'Done',
      (dialog: HTMLElement) =>
        userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    ],
    ['Escape', () => userEvent.keyboard('{Escape}')],
    [
      'a click away',
      async () => {
        await userEvent.click(document.body, { position: { x: 4, y: 4 } })
        // A click on the page leaves focus there in Firefox, so the author
        // comes back to the text, as Tab would bring them.
        screen.getByRole('textbox', { name: LABEL }).focus()
      }
    ]
  ])(
    'puts the caret back in the text after %s, so the next key never replaces the image',
    async (_, close) => {
      const onValueChange = renderImage(
        valueOf('email', image(), p('Doors open at 7pm'))
      )
      await clickIntoEditor(await screen.findByText('Doors open at 7pm'))
      await userEvent.keyboard(LINE_END)

      const dialog = await openSettings()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Fit' }))
      await close(dialog)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
      await userEvent.keyboard('!')

      await waitFor(() =>
        expect(
          (onValueChange.mock.lastCall![0] as EditorValue).doc.content
        ).toMatchObject([
          { type: 'image', attrs: { src: POSTER, width: expect.any(Number) } },
          p('Doors open at 7pm!')
        ])
      )
    }
  )

  it('puts the caret back in the text after a tap above its phone sheet', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const onValueChange = renderImage(
      valueOf('email', image(), p('Doors open at 7pm'))
    )
    await clickIntoEditor(await screen.findByText('Doors open at 7pm'))
    await userEvent.keyboard(LINE_END)

    await openSettings()
    await userEvent.click(document.body, { position: { x: 4, y: 4 } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    screen.getByRole('textbox', { name: LABEL }).focus()
    await userEvent.keyboard('!')

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content
      ).toMatchObject([{ type: 'image' }, p('Doors open at 7pm!')])
    )
  })
})
