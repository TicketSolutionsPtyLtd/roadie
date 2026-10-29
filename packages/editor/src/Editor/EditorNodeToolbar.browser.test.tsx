import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Field } from '@oztix/roadie-components/field'

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  type EditorValue,
  type EmbedProvider,
  defaultEmbedProviders
} from '../schema'
import { LINE_START, MOD, clickIntoEditor } from './testUtils'

const LABEL = 'Event description'
const CROWD = '/images/crowd.webp'
const STAGE = '/images/stage.webp'
const CROWD_ALT = 'The crowd at sunset'

// The tests serve no images, so this stands in for a loaded one's size.
const IMAGE_SIZE =
  '[data-slot="editor-image"] img { inline-size: 320px; block-size: 180px }'

let style: HTMLStyleElement
beforeAll(async () => {
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

const pictured = (alt: string): EditorValue => ({
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [{ type: 'image', attrs: { src: CROWD, alt } }, SOLD_OUT]
  }
})

const embedded = (attrs: Record<string, unknown>): EditorValue => ({
  version: 1,
  preset: 'rich',
  doc: { type: 'doc', content: [{ type: 'embed', attrs }, SOLD_OUT] }
})

const youtube = embedded({
  provider: 'youtube',
  id: 'exampleVid1',
  params: null
})

function NodeEditor(props: Partial<EditorProps>) {
  return (
    <Editor
      aria-label={LABEL}
      preset='rich'
      embedProviders={localPlayers}
      {...props}
    />
  )
}

function nodesIn(value: EditorValue, type: string) {
  return (value.doc.content ?? [])
    .filter((node) => node.type === type)
    .map((node) => node.attrs)
}

const lastValue = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall![0] as EditorValue

function undo() {
  return userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
}

// The person comes from outside the page: nothing focused or selected in it.
function leavePage() {
  getSelection()?.removeAllRanges()
  window.parent.focus()
}

async function clickImage() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox.querySelector('img')!)
  return textbox
}

async function clickEmbed() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  const player = await within(textbox).findByTitle(/embed/)
  await userEvent.click(player, { force: true })
  return textbox
}

async function selectWithArrows() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await clickIntoEditor(within(textbox).getByText('Sold out'))
  await userEvent.keyboard(`${LINE_START}{ArrowUp}`)
  return textbox
}

function deferred<T>() {
  return Promise.withResolvers<T>()
}

describe('Editor node toolbar', () => {
  it('shows an image’s actions when the image is clicked', async () => {
    render(<NodeEditor defaultValue={pictured(CROWD_ALT)} />)
    leavePage()
    await clickImage()

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Image actions'
    })
    await waitFor(() => expect(toolbar).toBeVisible())
    expect(
      within(toolbar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Alt text', 'Remove image'])
  })

  it('shows an embed’s actions when the embed is clicked', async () => {
    render(<NodeEditor defaultValue={youtube} />)
    leavePage()
    await clickEmbed()

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Embed actions'
    })
    expect(
      within(toolbar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Edit link', 'Remove embed'])
  })

  it('puts the caret in text clicked past the image, showing no actions', async () => {
    const onValueChange = vi.fn()
    render(
      <NodeEditor
        defaultValue={pictured(CROWD_ALT)}
        onValueChange={onValueChange}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    leavePage()
    await userEvent.click(within(textbox).getByText('Sold out'))
    await userEvent.keyboard('!')

    expect(lastValue(onValueChange).doc.content?.[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Sold out!' }]
    })
    expect(nodesIn(lastValue(onValueChange), 'image')).toHaveLength(1)
    expect(document.querySelector('[data-slot="editor-node-toolbar"]')).toBe(
      null
    )
  })

  it('isn’t a Tab stop itself, only its actions', async () => {
    render(<NodeEditor defaultValue={pictured(CROWD_ALT)} />)
    await clickImage()
    const toolbar = await screen.findByRole('toolbar', {
      name: 'Image actions'
    })

    const menu = toolbar.closest('[data-slot="editor-node-toolbar"]')
    await userEvent.tab()
    expect(document.activeElement).not.toBe(menu)
  })

  it('offers Replace image only with onUploadImage', async () => {
    render(
      <NodeEditor
        defaultValue={pictured(CROWD_ALT)}
        onUploadImage={async () => ({ src: STAGE })}
      />
    )
    await clickImage()

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Image actions'
    })
    expect(
      within(toolbar).getByRole('button', { name: 'Replace image' })
    ).toBeVisible()
  })

  it('hides when the selection leaves the node, or the editor loses focus', async () => {
    render(
      <>
        <NodeEditor defaultValue={pictured(CROWD_ALT)} />
        <button type='button'>Save</button>
      </>
    )
    const textbox = await clickImage()
    await screen.findByRole('toolbar', { name: 'Image actions' })

    await userEvent.click(within(textbox).getByText('Sold out'))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="editor-node-toolbar"]')).toBe(
        null
      )
    )

    await clickImage()
    await screen.findByRole('toolbar', { name: 'Image actions' })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="editor-node-toolbar"]')).toBe(
        null
      )
    )
  })

  it.each<[string, Partial<EditorProps>]>([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }]
  ])('hides when the editor turns %s', async (_, props) => {
    const { rerender } = render(<NodeEditor defaultValue={pictured('')} />)
    const textbox = await clickImage()
    await screen.findByRole('toolbar', { name: 'Image actions' })

    rerender(<NodeEditor defaultValue={pictured('')} {...props} />)

    await waitFor(() =>
      expect(document.querySelector('[data-slot="editor-node-toolbar"]')).toBe(
        null
      )
    )
    expect(within(textbox).getByText('No alt text')).toBeVisible()
  })

  it('moves focus to its actions with Alt+F10, and back to the node with Escape', async () => {
    render(
      <NodeEditor
        defaultValue={pictured(CROWD_ALT)}
        onUploadImage={async () => ({ src: STAGE })}
      />
    )
    const textbox = await selectWithArrows()
    const toolbar = await screen.findByRole('toolbar', {
      name: 'Image actions'
    })

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    expect(
      within(toolbar).getByRole('button', { name: 'Alt text' })
    ).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(
      within(toolbar).getByRole('button', { name: 'Replace image' })
    ).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(textbox).toHaveFocus())
    expect(screen.getByRole('toolbar', { name: 'Image actions' })).toBeVisible()
    await userEvent.keyboard('{Delete}')
    await waitFor(() => expect(within(textbox).queryByRole('img')).toBe(null))
  })

  it('still moves focus to the formatting toolbar with Alt+F10 off a node', async () => {
    render(<NodeEditor defaultValue={pictured(CROWD_ALT)} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText('Sold out'))

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')

    expect(
      screen.getByRole('button', { name: 'Block type: Paragraph' })
    ).toHaveFocus()
  })
})

describe('Editor node toolbar placement', () => {
  const INSET = 4
  const DOORS = {
    type: 'paragraph',
    content: [{ type: 'text', text: 'Doors at 7' }]
  }
  const afterText = (node: Record<string, unknown>): EditorValue => ({
    version: 1,
    preset: 'rich',
    doc: { type: 'doc', content: [DOORS, node, SOLD_OUT] }
  })
  const picture = { type: 'image', attrs: { src: CROWD, alt: CROWD_ALT } }
  const embed = (provider: string, id: string) => ({
    type: 'embed',
    attrs: { provider, id, params: null }
  })

  function expectInsideTopEnd(box: DOMRect, media: DOMRect) {
    expect(box.top - media.top).toBeGreaterThanOrEqual(INSET)
    expect(box.top - media.top).toBeLessThan(16)
    expect(media.right - box.right).toBeGreaterThanOrEqual(INSET)
    expect(media.right - box.right).toBeLessThan(16)
    expect(box.left).toBeGreaterThanOrEqual(media.left + INSET)
    expect(box.bottom).toBeLessThanOrEqual(media.bottom - INSET)
  }

  const intersects = (a: DOMRect, b: DOMRect) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

  async function placedToolbar(name: string) {
    const toolbar = await screen.findByRole('toolbar', { name })
    await waitFor(() => expect(toolbar).toBeVisible())
    return toolbar.closest<HTMLElement>('[data-slot="editor-node-toolbar"]')!
  }

  it.each<
    [
      string,
      Record<string, unknown>,
      () => Promise<HTMLElement>,
      string,
      string
    ]
  >([
    ['an image', picture, clickImage, 'img', 'Image actions'],
    [
      'a portrait TikTok player',
      embed('tiktok', '7000000000000000001'),
      clickEmbed,
      'iframe',
      'Embed actions'
    ],
    [
      'a YouTube player',
      embed('youtube', 'exampleVid1'),
      clickEmbed,
      'iframe',
      'Embed actions'
    ]
  ])(
    'sits inside %s, at its top-end corner, clear of the text above',
    async (_, node, select, media, name) => {
      render(<NodeEditor defaultValue={afterText(node)} />)
      leavePage()
      const textbox = await select()
      const menu = await placedToolbar(name)
      const doors = within(textbox).getByText('Doors at 7')

      await waitFor(() => {
        const box = menu.getBoundingClientRect()
        expectInsideTopEnd(
          box,
          textbox.querySelector(media)!.getBoundingClientRect()
        )
        expect(intersects(box, doors.getBoundingClientRect())).toBe(false)
      })
    }
  )

  it('stays in view inside the image when its top scrolls off', async () => {
    render(
      <>
        <NodeEditor defaultValue={afterText(picture)} />
        <div style={{ blockSize: '200vh' }} />
      </>
    )
    leavePage()
    const textbox = await clickImage()
    const menu = await placedToolbar('Image actions')
    const image = textbox.querySelector('img')!

    window.scrollBy(0, image.getBoundingClientRect().top + 60)

    try {
      await waitFor(() => {
        const media = image.getBoundingClientRect()
        const box = menu.getBoundingClientRect()
        expect(media.top).toBeLessThan(0)
        expect(box.top).toBeGreaterThanOrEqual(INSET)
        expect(box.top).toBeLessThan(16)
        expect(media.right - box.right).toBeGreaterThanOrEqual(INSET)
        expect(box.bottom).toBeLessThanOrEqual(media.bottom - INSET)
      })
    } finally {
      window.scrollTo(0, 0)
    }
  })

  const MEDIA_INSET = 8

  // The wrapper widens too: a 100% image inside a wrapper that hugs it is
  // circular, and WebKit sizes that to nothing.
  function widenImages() {
    const wide = document.createElement('style')
    wide.textContent =
      '[data-slot="editor-image"] { inline-size: 100% } [data-slot="editor-image"] img { inline-size: 100%; block-size: 240px }'
    document.head.append(wide)
    onTestFinished(() => wide.remove())
  }

  // Selected while the text has focus, as when someone clicks it mid-edit.
  async function selectWhileEditing(select: () => Promise<HTMLElement>) {
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText('Doors at 7'))
    await waitFor(() => expect(textbox).toHaveFocus())
    return select()
  }

  async function expectInsetInMedia(
    textbox: HTMLElement,
    media: string,
    name: string
  ) {
    const menu = await placedToolbar(name)
    const content = textbox.closest<HTMLElement>(
      '[data-slot="editor-content"]'
    )!
    await waitFor(() => {
      const box = menu.getBoundingClientRect()
      const frame = textbox.querySelector(media)!.getBoundingClientRect()
      expect(frame.right - box.right).toBeCloseTo(MEDIA_INSET, 0)
      expect(box.top - frame.top).toBeCloseTo(MEDIA_INSET, 0)
      expect(box.left).toBeGreaterThanOrEqual(frame.left + MEDIA_INSET)
      expect(box.right).toBeLessThanOrEqual(
        content.getBoundingClientRect().right
      )
    })
  }

  it.each<
    [
      string,
      Record<string, unknown>,
      () => Promise<HTMLElement>,
      string,
      string,
      boolean
    ]
  >([
    [
      'an image narrower than the text',
      picture,
      clickImage,
      'img',
      'Image actions',
      false
    ],
    ['a full-width image', picture, clickImage, 'img', 'Image actions', true],
    [
      'a portrait TikTok player',
      embed('tiktok', '7000000000000000001'),
      clickEmbed,
      'iframe',
      'Embed actions',
      false
    ],
    [
      'a YouTube player',
      embed('youtube', 'exampleVid1'),
      clickEmbed,
      'iframe',
      'Embed actions',
      false
    ]
  ])(
    'sits 8px inside the top-end corner of %s selected mid-edit',
    async (_, node, select, media, name, wide) => {
      if (wide) widenImages()
      render(<NodeEditor defaultValue={afterText(node)} />)
      const textbox = await selectWhileEditing(select)

      await expectInsetInMedia(textbox, media, name)
    }
  )

  it('sits inside a narrow image in a padded scrolling box', async () => {
    render(
      <div className='h-96 overflow-auto p-4'>
        <NodeEditor defaultValue={afterText(picture)} />
      </div>
    )
    const textbox = await selectWhileEditing(clickImage)

    await expectInsetInMedia(textbox, 'img', 'Image actions')
  })
})

describe('Editor node selection ring', () => {
  it.each<[string, EditorValue, () => Promise<HTMLElement>, string]>([
    ['an image', pictured(CROWD_ALT), clickImage, 'img'],
    ['an embed', youtube, clickEmbed, 'iframe']
  ])('rounds with %s’s corners and hugs it', async (_, value, select, tag) => {
    render(<NodeEditor defaultValue={value} />)
    const textbox = await select()
    const media = textbox.querySelector<HTMLElement>(tag)!
    const ring = await waitFor(() => {
      const selected = textbox.querySelector<HTMLElement>('[data-selected]')
      expect(selected).not.toBeNull()
      return selected!
    })
    const { outlineStyle, borderTopLeftRadius } = getComputedStyle(ring)

    expect(outlineStyle).toBe('solid')
    expect(parseFloat(borderTopLeftRadius)).toBeGreaterThan(0)
    expect(borderTopLeftRadius).toBe(
      getComputedStyle(media).borderTopLeftRadius
    )
    expect(ring.getBoundingClientRect().width).toBeCloseTo(
      media.getBoundingClientRect().width,
      0
    )
  })
})

describe('Editor image actions', () => {
  it('edits the alt text, which undo puts back', async () => {
    const onValueChange = vi.fn()
    render(
      <NodeEditor defaultValue={pictured('')} onValueChange={onValueChange} />
    )
    const textbox = await clickImage()
    expect(within(textbox).getByText('No alt text')).toBeVisible()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Alt text' })
    )
    const field = await screen.findByRole('textbox', { name: 'Alt text' })
    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.type(field, `${CROWD_ALT}{Enter}`)

    expect(
      await within(textbox).findByRole('img', { name: CROWD_ALT })
    ).toBeVisible()
    expect(within(textbox).queryByText('No alt text')).toBe(null)
    expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
      { src: CROWD, alt: CROWD_ALT }
    ])

    await waitFor(() => expect(textbox).toHaveFocus())
    await undo()
    await waitFor(() =>
      expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
        { src: CROWD, alt: '' }
      ])
    )
  })

  it('replaces the image through onUploadImage, keeping its alt text, which undo puts back', async () => {
    const upload = deferred<{ src: string; alt?: string }>()
    const onUploadImage = vi.fn(() => upload.promise)
    const onValueChange = vi.fn()
    render(
      <NodeEditor
        defaultValue={pictured(CROWD_ALT)}
        onUploadImage={onUploadImage}
        onValueChange={onValueChange}
      />
    )
    const textbox = await clickImage()
    const file = new File(['png'], 'stage.png', { type: 'image/png' })

    await userEvent.click(
      await screen.findByRole('button', { name: 'Replace image' })
    )
    await userEvent.upload(
      screen.getByLabelText('Replacement image file'),
      file
    )

    expect(onUploadImage).toHaveBeenCalledWith(file)
    expect(
      await within(textbox).findByRole('status', { name: 'Uploading image' })
    ).toBeVisible()

    upload.resolve({ src: STAGE, alt: 'A stage' })

    await waitFor(() =>
      expect(within(textbox).getByRole('img')).toHaveAttribute('src', STAGE)
    )
    expect(within(textbox).getByRole('img')).toHaveAccessibleName(CROWD_ALT)
    expect(within(textbox).queryByRole('status')).toBe(null)
    expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
      { src: STAGE, alt: CROWD_ALT }
    ])

    await userEvent.click(within(textbox).getByText('Sold out'))
    await undo()
    await waitFor(() =>
      expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
        { src: CROWD, alt: CROWD_ALT }
      ])
    )
  })

  it('takes the upload’s alt text when the replaced image had none', async () => {
    const onValueChange = vi.fn()
    render(
      <NodeEditor
        defaultValue={pictured('')}
        onUploadImage={async () => ({ src: STAGE, alt: 'A stage' })}
        onValueChange={onValueChange}
      />
    )
    await clickImage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Replace image' })
    )
    await userEvent.upload(
      screen.getByLabelText('Replacement image file'),
      new File(['png'], 'stage.png', { type: 'image/png' })
    )

    await waitFor(() =>
      expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
        { src: STAGE, alt: 'A stage' }
      ])
    )
  })

  it('shows a failed replacement in the Field, keeping the image', async () => {
    render(
      <Field>
        <Field.Label>{LABEL}</Field.Label>
        <Editor
          preset='rich'
          defaultValue={pictured(CROWD_ALT)}
          onUploadImage={() =>
            Promise.reject(new Error('That file is over 5 MB.'))
          }
        />
        <Field.ErrorText />
      </Field>
    )
    const textbox = await clickImage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Replace image' })
    )
    await userEvent.upload(
      screen.getByLabelText('Replacement image file'),
      new File(['png'], 'stage.png', { type: 'image/png' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That file is over 5 MB.'
    )
    expect(within(textbox).getByRole('img')).toHaveAttribute('src', CROWD)
  })

  it('removes the image, which undo puts back', async () => {
    const onValueChange = vi.fn()
    render(
      <NodeEditor
        defaultValue={pictured(CROWD_ALT)}
        onValueChange={onValueChange}
      />
    )
    const textbox = await clickImage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove image' })
    )

    await waitFor(() => expect(within(textbox).queryByRole('img')).toBe(null))
    expect(textbox).toHaveFocus()
    expect(screen.queryByRole('toolbar', { name: 'Image actions' })).toBe(null)

    await undo()
    expect(
      await within(textbox).findByRole('img', { name: CROWD_ALT })
    ).toBeVisible()
    expect(nodesIn(lastValue(onValueChange), 'image')).toEqual([
      { src: CROWD, alt: CROWD_ALT }
    ])
  })
})

describe('Editor embed actions', () => {
  async function editLink() {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit link' })
    )
    return screen.findByRole('textbox', { name: 'Video or audio link' })
  }

  it.each<[string, Record<string, unknown>, string]>([
    [
      'YouTube',
      { provider: 'youtube', id: 'exampleVid1', params: null },
      'https://www.youtube.com/watch?v=exampleVid1'
    ],
    [
      'Vimeo with its hash',
      { provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } },
      'https://vimeo.com/76979871/8272103f6e'
    ],
    [
      'TikTok, under a placeholder name TikTok ignores',
      { provider: 'tiktok', id: '7000000000000000001', params: null },
      'https://www.tiktok.com/@_/video/7000000000000000001'
    ]
  ])('fills Edit link with the share URL for %s', async (_, attrs, url) => {
    render(<NodeEditor defaultValue={embedded(attrs)} />)
    await clickEmbed()

    const field = await editLink()

    await waitFor(() => expect(field).toHaveFocus())
    expect(field).toHaveValue(url)
  })

  // Text first, so the editor starts with no embed selected.
  const lineup: EditorValue = {
    version: 1,
    preset: 'rich',
    doc: {
      type: 'doc',
      content: [
        SOLD_OUT,
        { type: 'embed', attrs: { provider: 'youtube', id: 'exampleVid1' } },
        {
          type: 'embed',
          attrs: {
            provider: 'spotify',
            id: 'exampleTrack0000000001',
            params: { type: 'artist' }
          }
        },
        { type: 'embed', attrs: { provider: 'vimeo', id: '76979871' } }
      ]
    }
  }

  it.each([
    [
      'YouTube embed exampleVid1',
      'https://www.youtube.com/watch?v=exampleVid1'
    ],
    [
      'Spotify embed exampleTrack0000000001',
      'https://open.spotify.com/artist/exampleTrack0000000001'
    ],
    ['Vimeo embed 76979871', 'https://vimeo.com/76979871']
  ])(
    'fills Edit link for the clicked %s, after the text',
    async (title, url) => {
      render(<NodeEditor defaultValue={lineup} />)
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(await within(textbox).findByTitle(title), {
        force: true
      })

      const field = await editLink()

      await waitFor(() => expect(field).toHaveFocus())
      expect(field).toHaveValue(url)
    }
  )

  it('opens the toolbar’s Embed empty with the caret in text after an embed', async () => {
    render(<NodeEditor defaultValue={youtube} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText('Sold out'))

    await userEvent.click(screen.getByRole('button', { name: 'Embed' }))
    const field = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })

    await waitFor(() => expect(field).toHaveFocus())
    expect(field).toHaveValue('')
    expect(
      screen.getByRole('button', { name: 'Embed link' })
    ).toBeInTheDocument()
  })

  it('replaces the embed with a new link, which undo puts back', async () => {
    const onValueChange = vi.fn()
    render(<NodeEditor defaultValue={youtube} onValueChange={onValueChange} />)
    const textbox = await clickEmbed()

    const field = await editLink()
    await userEvent.clear(field)
    await userEvent.type(
      field,
      'https://open.spotify.com/track/exampleTrack0000000001{Enter}'
    )

    expect(
      await within(textbox).findByTitle('Spotify embed exampleTrack0000000001')
    ).toBeVisible()
    expect(nodesIn(lastValue(onValueChange), 'embed')).toEqual([
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      }
    ])
    expect(textbox.querySelectorAll('iframe')).toHaveLength(1)

    await waitFor(() => expect(textbox).toHaveFocus())
    await undo()
    expect(
      await within(textbox).findByTitle('YouTube embed exampleVid1')
    ).toBeVisible()
    expect(nodesIn(lastValue(onValueChange), 'embed')).toEqual([
      { provider: 'youtube', id: 'exampleVid1', params: null }
    ])
  })

  it('resolves a short link through resolveUrl when editing', async () => {
    const resolveUrl = vi.fn(
      async () => 'https://www.tiktok.com/@oztix/video/7000000000000000001'
    )
    render(<NodeEditor defaultValue={youtube} resolveUrl={resolveUrl} />)
    const textbox = await clickEmbed()

    const field = await editLink()
    await userEvent.clear(field)
    await userEvent.type(field, 'https://vm.tiktok.com/ZMabcdef/{Enter}')

    expect(
      await within(textbox).findByTitle('TikTok embed 7000000000000000001')
    ).toBeVisible()
    expect(textbox.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('refuses a look-alike host, keeping the embed', async () => {
    const onValueChange = vi.fn()
    render(<NodeEditor defaultValue={youtube} onValueChange={onValueChange} />)
    const textbox = await clickEmbed()

    const field = await editLink()
    await userEvent.clear(field)
    await userEvent.type(
      field,
      'https://youtube.com.evil.test/watch?v=exampleVid2{Enter}'
    )

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(/can’t be embedded/)
    expect(
      within(textbox).getByTitle('YouTube embed exampleVid1')
    ).toBeVisible()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('removes the embed, which undo puts back', async () => {
    render(<NodeEditor defaultValue={youtube} />)
    const textbox = await clickEmbed()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove embed' })
    )

    await waitFor(() => expect(textbox.querySelector('iframe')).toBe(null))
    expect(textbox).toHaveTextContent('Sold out')

    await undo()
    expect(
      await within(textbox).findByTitle('YouTube embed exampleVid1')
    ).toBeVisible()
  })
})

describe('Editor embed size', () => {
  const ringed = (root: HTMLElement) =>
    [root, ...root.querySelectorAll<HTMLElement>('*')].find(
      (element) => getComputedStyle(element).outlineStyle !== 'none'
    )

  it('hugs a portrait player, ringing only the player when selected', async () => {
    render(
      <NodeEditor
        defaultValue={embedded({
          provider: 'tiktok',
          id: '7000000000000000001',
          params: null
        })}
      />
    )
    const textbox = await clickEmbed()
    await screen.findByRole('toolbar', { name: 'Embed actions' })
    const player = textbox.querySelector('iframe')!.getBoundingClientRect()
    const ring = ringed(textbox)!.getBoundingClientRect()
    const content = textbox.getBoundingClientRect()

    expect(Math.abs(ring.width - player.width)).toBeLessThanOrEqual(2)
    expect(player.width).toBeLessThan(content.width / 2)
    expect(player.left).toBeCloseTo(ring.left, 0)
  })

  it('fills the text’s width with a landscape player', async () => {
    render(<NodeEditor defaultValue={youtube} />)
    const textbox = await clickEmbed()
    await screen.findByRole('toolbar', { name: 'Embed actions' })
    const player = textbox.querySelector('iframe')!.getBoundingClientRect()
    const paragraph = within(textbox).getByText('Sold out')

    expect(player.width).toBeCloseTo(paragraph.getBoundingClientRect().width, 0)
    expect(ringed(textbox)!.getBoundingClientRect().width).toBeCloseTo(
      player.width,
      0
    )
  })
})
