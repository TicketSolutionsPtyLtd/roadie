import { NewspaperIcon } from '@phosphor-icons/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page as browserPage, page, userEvent } from 'vitest/browser'

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { type EditorBlock, Node } from '../extensions'
import type { EditorValue, JSONContent } from '../schema'
import { MOD, clickIntoEditor, selectParagraph } from './testUtils'

const LABEL = 'Newsletter'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => page.viewport(1280, 800))

const p = (text?: string): JSONContent =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }

const column = (...content: JSONContent[]): JSONContent => ({
  type: 'column',
  content
})

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const spacer = { type: 'spacer', attrs: { height: 32 } }

function renderEmail(props: Partial<EditorProps> = {}) {
  const onValueChange = vi.fn()
  render(
    <div style={{ paddingTop: 96 }}>
      <Editor
        aria-label={LABEL}
        preset='email'
        toolbar='docked'
        defaultValue={email(p('Doors 7pm'), p('Gates 6pm'))}
        onValueChange={onValueChange}
        {...props}
      />
    </div>
  )
  return onValueChange
}

const textbox = () => screen.findByRole('textbox', { name: LABEL })

async function clickInto(text: string) {
  await clickIntoEditor(within(await textbox()).getByText(text))
}

async function openFromDockedBar() {
  const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
  await userEvent.click(within(bar).getByRole('button', { name: 'Blocks' }))
  return screen.findByRole('dialog', { name: 'Blocks' })
}

const tileGroups = (drawer: HTMLElement) =>
  within(drawer)
    .getAllByRole('group')
    .map((group) => [
      document.getElementById(group.getAttribute('aria-labelledby')!)
        ?.textContent,
      within(group)
        .getAllByRole('button')
        .map((tile) => tile.textContent)
    ])

describe('Editor blocks drawer', () => {
  it('opens from the docked toolbar with the blocks as tiles in groups', async () => {
    renderEmail({
      onUploadImage: async () => ({ src: 'https://example.com/crowd.png' })
    })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(tileGroups(drawer)).toEqual([
      ['Sections', ['Header', 'Event', 'Two events', 'Lineup']],
      [
        'Text',
        [
          'Paragraph',
          'Heading 2',
          'Heading 3',
          'Heading 4',
          'Bulleted list',
          'Numbered list'
        ]
      ],
      ['Media', ['Image']],
      [
        'Layout',
        ['Section', '2 columns', '3 columns', '4 columns', 'Spacer', 'Divider']
      ],
      ['Email', ['Button']]
    ])
    for (const tile of within(drawer).getAllByRole('button')) {
      expect(tile.querySelector('svg')).not.toBe(null)
    }
  })

  const heading3 = (text?: string): JSONContent => ({
    type: 'heading',
    attrs: { level: 3 },
    ...(text ? { content: [{ type: 'text', text }] } : {})
  })
  const bulletList = (text?: string): JSONContent => ({
    type: 'bulletList',
    content: [{ type: 'listItem', content: [p(text)] }]
  })
  const twoColumns = (text?: string): JSONContent => ({
    type: 'columns',
    content: [column(p(text)), column(p())]
  })

  it.each<[string, string, JSONContent[], JSONContent[]]>([
    [
      'a spacer',
      'Spacer',
      [p('Doors 7pm'), spacer, p('Gates 6pm')],
      [p('Doors 7pm'), spacer, p('BarGates 6pm')]
    ],
    [
      'a paragraph',
      'Paragraph',
      [p('Doors 7pm'), p(), p('Gates 6pm')],
      [p('Doors 7pm'), p('Bar'), p('Gates 6pm')]
    ],
    [
      'a heading',
      'Heading 3',
      [p('Doors 7pm'), heading3(), p('Gates 6pm')],
      [p('Doors 7pm'), heading3('Bar'), p('Gates 6pm')]
    ],
    [
      'a list',
      'Bulleted list',
      [p('Doors 7pm'), bulletList(), p('Gates 6pm')],
      [p('Doors 7pm'), bulletList('Bar'), p('Gates 6pm')]
    ],
    [
      'columns',
      '2 columns',
      [p('Doors 7pm'), twoColumns(), p('Gates 6pm')],
      [p('Doors 7pm'), twoColumns('Bar'), p('Gates 6pm')]
    ]
  ])(
    'inserts %s after the caret’s block, closes, and hands back the caret',
    async (_, name, inserted, typed) => {
      const onValueChange = renderEmail()
      await clickInto('Doors 7pm')

      const drawer = await openFromDockedBar()
      await userEvent.click(within(drawer).getByRole('button', { name }))

      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith(email(...inserted))
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
      await waitFor(async () => expect(await textbox()).toHaveFocus())
      await userEvent.keyboard('Bar')
      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith(email(...typed))
      )
    }
  )

  it('puts a section after the columns when the caret is in one', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'columns',
        content: [column(p('Lineup')), column(p('Set times'))]
      })
    })
    await clickInto('Lineup')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Section' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          {
            type: 'columns',
            content: [column(p('Lineup')), column(p('Set times'))]
          },
          { type: 'section', content: [p()] }
        )
      )
    )
  })

  it('fills an empty line instead of adding after it', async () => {
    const onValueChange = renderEmail({ defaultValue: email(p()) })
    await clickIntoEditor(await textbox())

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Divider' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'horizontalRule' }, p())
      )
    )
  })

  it.each<[string, JSONContent]>([
    ['Paragraph', p('Bar')],
    ['Heading 3', heading3('Bar')]
  ])(
    'turns an empty line into a %s rather than adding a line',
    async (name, typed) => {
      const onValueChange = renderEmail({
        defaultValue: email(p('Doors 7pm'), p(), p('Gates 6pm'))
      })
      await clickInto('Doors 7pm')
      await userEvent.keyboard('{ArrowDown}')

      const drawer = await openFromDockedBar()
      await userEvent.click(within(drawer).getByRole('button', { name }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
      await waitFor(async () => expect(await textbox()).toHaveFocus())
      await userEvent.keyboard('Bar')

      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith(
          email(p('Doors 7pm'), typed, p('Gates 6pm'))
        )
      )
    }
  )

  const divider = { type: 'horizontalRule' }

  it('adds after a selected block', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm'), spacer, p('Gates 6pm'))
    })
    await userEvent.click(
      (await textbox()).querySelector('[data-type="spacer"]')!
    )

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Divider' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), spacer, divider, p('Gates 6pm'))
      )
    )
  })

  it('adds at the gap cursor between two blocks', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm'), spacer, spacer, p('Gates 6pm'))
    })
    const [, second] = (await textbox()).querySelectorAll(
      '[data-type="spacer"]'
    )
    await userEvent.click(second!)
    await userEvent.keyboard('{ArrowLeft}')
    await expect
      .poll(() => document.querySelector('.ProseMirror-gapcursor'))
      .not.toBe(null)

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Divider' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), spacer, divider, p(), spacer, p('Gates 6pm'))
      )
    )
  })

  it('adds at the end with everything selected', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')
    await userEvent.keyboard(`{${MOD}>}a{/${MOD}}`)

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Divider' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), p('Gates 6pm'), divider, p())
      )
    )
  })

  it('offers no Image tile without onUploadImage', async () => {
    renderEmail()
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(within(drawer).queryByRole('button', { name: 'Image' })).toBe(null)
    expect(within(drawer).queryByRole('group', { name: 'Media' })).toBe(null)
  })

  it('keeps a button with no label when a text block is picked on it', async () => {
    const button = {
      type: 'button',
      attrs: { href: 'https://example.com/tickets' }
    }
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm'), button, p('Gates 6pm'))
    })
    await clickInto('Doors 7pm')
    await userEvent.keyboard('{ArrowDown}')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Heading 3' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), heading3(), button, p('Gates 6pm'))
      )
    )
  })

  it('opens the button’s link field on a new line after the caret’s block', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Button' })
    )
    const link = await screen.findByRole('textbox', { name: 'Button link' })
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Blocks' })).toBe(null)
    )
    await waitFor(() => expect(link).toHaveFocus())
    await userEvent.keyboard('https://example.com/tickets{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          p('Doors 7pm'),
          {
            type: 'button',
            attrs: { href: 'https://example.com/tickets' },
            content: [{ type: 'text', text: 'Button' }]
          },
          p('Gates 6pm')
        )
      )
    )
  })

  it('opens the button’s link field on an empty line without adding one', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(p('Doors 7pm'), p(), p('Gates 6pm'))
    })
    await clickInto('Doors 7pm')
    await userEvent.keyboard('{ArrowDown}')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Button' })
    )
    await screen.findByRole('textbox', { name: 'Button link' })
    await userEvent.keyboard('{Escape}')

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('opens from the floating toolbar, adding after the selected text’s block', async () => {
    const onValueChange = renderEmail({ toolbar: 'floating' })
    await selectParagraph(within(await textbox()).getByText('Doors 7pm'))

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Selection formatting'
    })
    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Blocks' })
    )
    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Spacer' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), spacer, p('Gates 6pm'))
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
  })

  it('works by keyboard from the docked toolbar', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    await waitFor(() =>
      expect(within(bar).getByRole('button', { name: 'Blocks' })).toHaveFocus()
    )
    await userEvent.keyboard('{Enter}')

    const drawer = await screen.findByRole('dialog', { name: 'Blocks' })
    await waitFor(() =>
      expect(
        within(drawer).getByRole('button', { name: 'Header' })
      ).toHaveFocus()
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await waitFor(async () => expect(await textbox()).toHaveFocus())

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    await waitFor(() =>
      expect(within(bar).getByRole('button', { name: 'Blocks' })).toHaveFocus()
    )
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('dialog', { name: 'Blocks' })
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Header'
        })
      ).toHaveFocus()
    )
    await userEvent.keyboard('{ArrowRight}'.repeat(14))
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Spacer' })
    ).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), spacer, p('Gates 6pm'))
      )
    )
    await waitFor(async () => expect(await textbox()).toHaveFocus())
  })

  it('hands focus back on Escape after an earlier pick', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    await userEvent.click(
      within(await openFromDockedBar()).getByRole('button', { name: 'Spacer' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))

    await openFromDockedBar()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await waitFor(async () => expect(await textbox()).toHaveFocus())
  })

  it('takes a block back in one undo', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    await userEvent.click(
      within(await openFromDockedBar()).getByRole('button', { name: 'Event' })
    )
    await waitFor(async () => expect(await textbox()).toHaveFocus())
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), p('Gates 6pm'))
      )
    )
  })

  it('disables Blocks in a read-only editor', async () => {
    renderEmail({ readOnly: true })

    const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
    expect(within(bar).getByRole('button', { name: 'Blocks' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('slides in from the right on a desktop and up from the bottom on a phone', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const wide = await openFromDockedBar()
    await waitFor(() => {
      const box = wide.getBoundingClientRect()
      expect(box.right).toBeCloseTo(window.innerWidth, 0)
      expect(box.left).toBeGreaterThan(window.innerWidth / 2)
    })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))

    await page.viewport(390, 700)
    const narrow = await openFromDockedBar()
    await waitFor(() => {
      const box = narrow.getBoundingClientRect()
      expect(box.bottom).toBeCloseTo(window.innerHeight, 0)
      expect(box.left).toBeCloseTo(0, 0)
      expect(box.right).toBeCloseTo(window.innerWidth, 0)
    })
  })

  it.each(['basic', 'rich'] as const)(
    'offers no Blocks button in the %s preset',
    async (preset) => {
      render(<Editor aria-label={LABEL} preset={preset} toolbar='docked' />)

      const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
      expect(within(bar).queryByRole('button', { name: 'Blocks' })).toBe(null)
    }
  )
})

describe('Editor blocks drawer finding and moving', () => {
  const tileNames = (drawer: HTMLElement) =>
    within(drawer)
      .queryAllByRole('button')
      .filter((tile) => tile.dataset.slot === 'editor-blocks-tile')
      .map((tile) => tile.textContent)

  it('filters the tiles with the / menu’s matcher, and Enter picks the first', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()

    await userEvent.type(
      within(drawer).getByRole('searchbox', { name: 'Find a block' }),
      'hr'
    )
    expect(tileNames(drawer)).toEqual(['Divider'])
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), { type: 'horizontalRule' }, p('Gates 6pm'))
      )
    )
  })

  it('opens with an empty filter after a pick', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()
    await userEvent.type(
      within(drawer).getByRole('searchbox', { name: 'Find a block' }),
      'hr{Enter}'
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Blocks' })).toBe(null)
    )

    const reopened = await openFromDockedBar()

    expect(
      within(reopened).getByRole('searchbox', { name: 'Find a block' })
    ).toHaveValue('')
    expect(tileNames(reopened).length).toBeGreaterThan(1)
  })

  it('ranks a name that starts with the filter first', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()

    await userEvent.type(
      within(drawer).getByRole('searchbox', { name: 'Find a block' }),
      '2'
    )

    expect(tileNames(drawer)).toEqual(['2 columns', 'Heading 2'])
  })

  it('types into the filter from a tile', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        'data-slot',
        'editor-blocks-tile'
      )
    )

    await userEvent.keyboard('spa')

    const filter = within(drawer).getByRole('searchbox', {
      name: 'Find a block'
    })
    expect(filter).toHaveFocus()
    expect(filter).toHaveValue('spa')
    expect(tileNames(drawer)).toEqual(['Spacer'])
  })

  it('moves between tiles with the arrow keys, with one tab stop', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()
    const tile = (name: string) => within(drawer).getByRole('button', { name })
    const [first, second] = tileNames(drawer)
    await waitFor(() => expect(tile(first!)).toHaveFocus())

    await userEvent.keyboard('{ArrowRight}')
    expect(tile(second!)).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    const moved = (
      document.activeElement as HTMLElement
    ).getBoundingClientRect()
    const above = tile(second!).getBoundingClientRect()
    expect(moved.top).toBeGreaterThan(above.top)
    // The nearest tile in the next row, which is under it unless that row is short.
    expect(moved.left).toBeLessThanOrEqual(above.left + 1)
    await userEvent.keyboard('{End}')
    const last = document.activeElement
    expect(last?.textContent).toBe(tileNames(drawer).at(-1))

    const stops = within(drawer)
      .getAllByRole('button')
      .filter(
        (button) =>
          button.dataset.slot === 'editor-blocks-tile' && button.tabIndex === 0
      )
    expect(stops).toEqual([last])
  })

  it('leaves the email usable beside it from 1280px wide', async () => {
    renderEmail()
    await clickInto('Doors 7pm')
    const drawer = await openFromDockedBar()

    expect(document.querySelector('[data-slot="drawer-backdrop"]')).toBe(null)
    await clickInto('Gates 6pm')

    expect(await textbox()).toHaveFocus()
    expect(drawer).toBeVisible()
  })

  it('takes over the page below 1280px wide', async () => {
    await page.viewport(1024, 800)
    renderEmail()
    await clickInto('Doors 7pm')

    await openFromDockedBar()

    expect(
      document.querySelector('[data-slot="drawer-backdrop"]')
    ).toBeInTheDocument()
  })
})

describe('Editor blocks drawer in the blocks preset', () => {
  const page = (...content: JSONContent[]): EditorValue => ({
    version: 1,
    preset: 'blocks',
    doc: { type: 'doc', content }
  })
  const block = (blockId: string, text: string): JSONContent => ({
    type: 'paragraph',
    attrs: { blockId },
    content: [{ type: 'text', text }]
  })

  function renderPage(props: Partial<EditorProps> = {}) {
    const onValueChange = vi.fn()
    render(
      <div style={{ paddingTop: 96, paddingInline: 64 }}>
        <Editor
          aria-label={LABEL}
          preset='blocks'
          defaultValue={page(
            block('doors', 'Doors 7pm'),
            block('gates', 'Gates 6pm')
          )}
          onValueChange={onValueChange}
          {...props}
        />
      </div>
    )
    return onValueChange
  }

  const types = (onValueChange: ReturnType<typeof vi.fn>) =>
    (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map(
      ({ type, content }) => [type, content?.[0]?.text]
    )

  const hero: EditorBlock = {
    node: Node.create({
      name: 'hero',
      group: 'block',
      atom: true,
      parseHTML: () => [{ tag: 'div[data-hero]' }],
      renderHTML: () => ['div', { 'data-hero': '' }]
    }),
    label: 'Hero',
    icon: NewspaperIcon,
    group: 'Sections'
  }
  const groupNames = (drawer: HTMLElement) =>
    tileGroups(drawer).map(([group]) => group)

  it('lists Sections first on a phone, where the sheet is short of room', async () => {
    await browserPage.viewport(390, 844)
    renderPage({ extensions: [hero] })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(groupNames(drawer)).toEqual(['Sections', 'Text', 'Media', 'Layout'])
  })

  it('keeps the preset’s order on a desktop', async () => {
    renderPage({ toolbar: 'docked', extensions: [hero] })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(groupNames(drawer)).toEqual(['Text', 'Media', 'Layout', 'Sections'])
  })

  it('opens from the docked toolbar with the preset’s blocks as tiles', async () => {
    renderPage({
      toolbar: 'docked',
      onUploadImage: async () => ({ src: '/images/crowd.webp' })
    })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(tileGroups(drawer)).toEqual([
      [
        'Text',
        [
          'Paragraph',
          'Heading 2',
          'Heading 3',
          'Heading 4',
          'Bulleted list',
          'Numbered list',
          'Quote'
        ]
      ],
      ['Media', ['Image', 'Embed']],
      ['Layout', ['Divider', 'Table']]
    ])
  })

  it('adds a block after the caret’s block', async () => {
    const onValueChange = renderPage({ toolbar: 'docked' })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Divider' })
    )

    await waitFor(() =>
      expect(types(onValueChange)).toEqual([
        ['paragraph', 'Doors 7pm'],
        ['horizontalRule', undefined],
        ['paragraph', 'Gates 6pm']
      ])
    )
    await waitFor(async () => expect(await textbox()).toHaveFocus())
  })

  it('opens the Embed popover on a new line after the caret’s block', async () => {
    const onValueChange = renderPage({ toolbar: 'docked' })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Embed' }))

    const field = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })
    await waitFor(() => expect(field).toHaveFocus())
    expect(types(onValueChange)).toEqual([
      ['paragraph', 'Doors 7pm'],
      ['paragraph', undefined],
      ['paragraph', 'Gates 6pm']
    ])
  })

  it('shows an add button before the grip, which opens the insert menu after the block', async () => {
    const onValueChange = renderPage()
    const row = await screen.findByText('Doors 7pm')
    await userEvent.hover(row)

    const add = await screen.findByRole('button', { name: 'Add block' })
    const grip = await screen.findByRole('button', { name: 'Block actions' })
    await waitFor(() =>
      expect(add.getBoundingClientRect().right).toBeLessThanOrEqual(
        grip.getBoundingClientRect().left
      )
    )
    await userEvent.click(add)

    expect(await screen.findByRole('listbox', { name: 'Insert' })).toBeVisible()
    await waitFor(() =>
      expect(types(onValueChange)).toEqual([
        ['paragraph', 'Doors 7pm'],
        ['paragraph', '/'],
        ['paragraph', 'Gates 6pm']
      ])
    )
  })
})

describe('Editor blocks drawer sections', () => {
  // Placeholder copy shows as hints, so the lines are empty.
  const heading = (level: number, text?: string): JSONContent => ({
    type: 'heading',
    attrs: { level },
    ...(text ? { content: [{ type: 'text', text }] } : {})
  })
  const getTickets: JSONContent = {
    type: 'button',
    content: [{ type: 'text', text: 'Get tickets' }]
  }
  const event = [heading(3), p(), getTickets]
  const unsubscribeUrl = {
    key: 'unsubscribe_url',
    label: 'Unsubscribe page',
    kind: 'url' as const,
    tokens: { ae: '#OptOut#' }
  }

  it.each<[string, JSONContent]>([
    [
      'Header',
      {
        type: 'section',
        content: [heading(2), p()]
      }
    ],
    ['Event', { type: 'section', content: event }],
    [
      'Two events',
      { type: 'columns', content: [column(...event), column(...event)] }
    ]
  ])('adds the %s section after the caret’s block', async (name, section) => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(within(drawer).getByRole('button', { name }))

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(p('Doors 7pm'), section, p('Gates 6pm'))
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    await waitFor(async () => expect(await textbox()).toHaveFocus())
  })

  it('puts the caret on the section’s first line, so typing fills it', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Header' })
    )
    await waitFor(async () => expect(await textbox()).toHaveFocus())
    await userEvent.keyboard('Ochre Kite Weekender')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          p('Doors 7pm'),
          {
            type: 'section',
            content: [heading(2, 'Ochre Kite Weekender'), p()]
          },
          p('Gates 6pm')
        )
      )
    )
  })

  it('puts a section in place of an empty email’s line, with no empty line after it', async () => {
    const onValueChange = renderEmail({ defaultValue: email(p()) })
    await clickIntoEditor((await textbox()).querySelector('p')!)

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Header' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.map(
          ({ type }) => type
        )
      ).toEqual(['section'])
    )
  })

  it('puts a section after the section with the caret, not inside it', async () => {
    const onValueChange = renderEmail({
      defaultValue: email(
        { type: 'section', content: [p('Doors 7pm'), p('Gates 6pm')] },
        p('All ages')
      )
    })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Event' }))

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          { type: 'section', content: [p('Doors 7pm'), p('Gates 6pm')] },
          { type: 'section', content: event },
          p('All ages')
        )
      )
    )
  })

  it('offers a footer linking to the unsubscribe page when the app has one', async () => {
    const onValueChange = renderEmail({
      variables: [
        { key: 'first_name', label: 'First name', tokens: { ae: '#Name#' } },
        unsubscribeUrl
      ]
    })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    const sections = within(drawer).getByRole('group', { name: 'Sections' })
    expect(
      within(sections)
        .getAllByRole('button')
        .map((tile) => tile.textContent)
    ).toEqual(['Header', 'Event', 'Two events', 'Lineup', 'Footer'])
    await userEvent.click(
      within(sections).getByRole('button', { name: 'Footer' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email(
          p('Doors 7pm'),
          {
            type: 'section',
            content: [
              { type: 'horizontalRule' },
              p(
                'You’re getting this email because you signed up for news from us.'
              ),
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Unsubscribe',
                    marks: [
                      {
                        type: 'link',
                        attrs: { href: undefined, variable: 'unsubscribe_url' }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          p('Gates 6pm')
        )
      )
    )
  })

  it.each([
    ['its key', { ...unsubscribeUrl, label: 'Opt-out page' }],
    ['its label', { ...unsubscribeUrl, key: 'opt_out' }]
  ])(
    'offers a footer for a link variable only %s names',
    async (_, variable) => {
      renderEmail({ variables: [variable] })
      await clickInto('Doors 7pm')

      const drawer = await openFromDockedBar()

      expect(
        within(drawer).getByRole('button', { name: 'Footer' })
      ).toBeInTheDocument()
    }
  )

  it.each([
    [
      'a link variable for another page',
      { ...unsubscribeUrl, key: 'view_url', label: 'View in browser' }
    ],
    [
      'a text variable named for unsubscribing',
      {
        key: 'unsubscribe_note',
        label: 'Unsubscribe note',
        tokens: { ae: '#Note#' }
      }
    ]
  ])('offers no footer with only %s', async (_, variable) => {
    renderEmail({ variables: [variable] })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(within(drawer).queryByRole('button', { name: 'Footer' })).toBe(null)
  })
})
