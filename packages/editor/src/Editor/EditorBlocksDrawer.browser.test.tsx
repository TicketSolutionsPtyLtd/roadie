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
import { page, userEvent } from 'vitest/browser'

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'
import { clickIntoEditor, selectParagraph } from './testUtils'

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
      ['Email', ['Button']],
      ['Sections', ['Header', 'Event', 'Two events']]
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
          { type: 'section', content: [p()] },
          p()
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

  it('opens the button’s link field on a new line after the caret’s block', async () => {
    const onValueChange = renderEmail()
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Button' })
    )
    const link = await screen.findByRole('textbox', { name: 'Button link' })
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
          p(),
          p('Gates 6pm')
        )
      )
    )
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
        within(drawer).getByRole('button', { name: 'Paragraph' })
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
          name: 'Paragraph'
        })
      ).toHaveFocus()
    )
    await userEvent.keyboard('{Tab}'.repeat(10))
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

  it.each(['basic', 'rich', 'blocks'] as const)(
    'offers no Blocks button in the %s preset',
    async (preset) => {
      render(<Editor aria-label={LABEL} preset={preset} toolbar='docked' />)

      const bar = await screen.findByRole('toolbar', { name: 'Formatting' })
      expect(within(bar).queryByRole('button', { name: 'Blocks' })).toBe(null)
    }
  )
})

describe('Editor blocks drawer sections', () => {
  const heading = (level: number, text: string): JSONContent => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }]
  })
  const getTickets: JSONContent = {
    type: 'button',
    content: [{ type: 'text', text: 'Get tickets' }]
  }
  const event = [
    heading(3, 'Event name'),
    p('Fri 14 Mar, 7:30pm · Venue, City'),
    getTickets
  ]
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
        content: [
          heading(2, 'Headline'),
          p('A line or two on what this email is about.')
        ]
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
    ).toEqual(['Header', 'Event', 'Two events', 'Footer'])
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

  it('offers no footer without an unsubscribe link variable', async () => {
    renderEmail({
      variables: [
        { ...unsubscribeUrl, key: 'view_url', label: 'View in browser' }
      ]
    })
    await clickInto('Doors 7pm')

    const drawer = await openFromDockedBar()

    expect(within(drawer).queryByRole('button', { name: 'Footer' })).toBe(null)
  })
})
