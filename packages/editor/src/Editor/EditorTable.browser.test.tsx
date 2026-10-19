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
import { page, userEvent } from 'vitest/browser'

import { Editor, type EditorProps, useEditorContext } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Event description'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

const cell = (type: string, text: string) => ({
  type,
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

const setTimes: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [cell('tableHeader', 'Time'), cell('tableHeader', 'Act')]
          },
          {
            type: 'tableRow',
            content: [cell('tableCell', '9pm'), cell('tableCell', 'Ochre Kite')]
          }
        ]
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'Sold out' }] }
    ]
  }
}

const MOD = /^(Mac|iP)/.test(navigator.platform) ? 'Meta' : 'Control'

function TableEditor(props: Partial<EditorProps>) {
  return <Editor aria-label={LABEL} preset='rich' {...props} />
}

const lastValue = (onValueChange: ReturnType<typeof vi.fn>) =>
  onValueChange.mock.lastCall![0] as EditorValue

function tableIn({ doc }: EditorValue) {
  return doc.content?.find((node) => node.type === 'table')
}

// Each row as its cells' types and text, so a test reads the grid at a glance.
function grid(table: JSONContent | undefined) {
  return (table?.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => {
      const text = (cell.content ?? [])
        .flatMap((paragraph) => paragraph.content ?? [])
        .map((node) => node.text)
        .join('')
      return `${cell.type === 'tableHeader' ? 'th' : 'td'}:${text}`
    })
  )
}

async function clickCell(text: string) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(within(textbox).getByText(text))
  return textbox
}

async function tableActions() {
  return screen.findByRole('toolbar', { name: 'Table actions' })
}

describe('Editor tables', () => {
  it('inserts a 3 by 3 table with a header row from the Table control', async () => {
    const onValueChange = vi.fn()
    render(<TableEditor onValueChange={onValueChange} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)

    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    await userEvent.keyboard('Time')

    await waitFor(() =>
      expect(grid(tableIn(lastValue(onValueChange)))).toEqual([
        ['th:Time', 'th:', 'th:'],
        ['td:', 'td:', 'td:'],
        ['td:', 'td:', 'td:']
      ])
    )
    expect(within(textbox).getByText('Time').closest('th')).not.toBe(null)
  })

  it('turns the Table control off while the caret is in a table', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    const textbox = await clickCell('9pm')
    const insert = screen.getByRole('button', { name: 'Table' })

    await waitFor(() => expect(insert).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(within(textbox).getByText('Sold out'))
    await waitFor(() =>
      expect(insert).not.toHaveAttribute('aria-disabled', 'true')
    )
  })

  it('moves between cells with Tab and Shift+Tab', async () => {
    const onValueChange = vi.fn()
    render(
      <TableEditor defaultValue={setTimes} onValueChange={onValueChange} />
    )
    await clickCell('Time')

    // Each move selects the next cell's text, so typing replaces it.
    await userEvent.keyboard('{Tab}Stage')
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}Doors')

    await waitFor(() =>
      expect(grid(tableIn(lastValue(onValueChange)))).toEqual([
        ['th:Doors', 'th:Stage'],
        ['td:9pm', 'td:Ochre Kite']
      ])
    )
  })

  it('leaves the editor with Shift+Tab from the first cell, as from any text', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    const textbox = await clickCell('Time')

    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

    await waitFor(() => expect(textbox).not.toHaveFocus())
    expect(
      screen.getByRole('toolbar', { name: 'Formatting' })
    ).toContainElement(document.activeElement as HTMLElement)
  })

  it('shows the table actions while the caret is in a table, in order', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    const textbox = await clickCell('9pm')

    const toolbar = await tableActions()
    await waitFor(() => expect(toolbar).toBeVisible())
    expect(
      [...toolbar.querySelectorAll('button, [role="separator"]')].map((item) =>
        item.getAttribute('role') === 'separator'
          ? '|'
          : item.getAttribute('aria-label')
      )
    ).toEqual([
      'Add row above',
      'Add row below',
      'Add column before',
      'Add column after',
      '|',
      'Delete row',
      'Delete column',
      '|',
      'Header row',
      '|',
      'Delete table'
    ])

    await userEvent.click(within(textbox).getByText('Sold out'))
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Table actions' })).toBe(
        null
      )
    )
  })

  it.each<[string, string[][]]>([
    [
      'Add row above',
      [
        ['th:Time', 'th:Act'],
        ['td:', 'td:'],
        ['td:9pm', 'td:Ochre Kite']
      ]
    ],
    [
      'Add row below',
      [
        ['th:Time', 'th:Act'],
        ['td:9pm', 'td:Ochre Kite'],
        ['td:', 'td:']
      ]
    ],
    [
      'Add column before',
      [
        ['th:', 'th:Time', 'th:Act'],
        ['td:', 'td:9pm', 'td:Ochre Kite']
      ]
    ],
    [
      'Add column after',
      [
        ['th:Time', 'th:', 'th:Act'],
        ['td:9pm', 'td:', 'td:Ochre Kite']
      ]
    ],
    ['Delete row', [['th:Time', 'th:Act']]],
    ['Delete column', [['th:Act'], ['td:Ochre Kite']]],
    [
      'Header row',
      [
        ['td:Time', 'td:Act'],
        ['td:9pm', 'td:Ochre Kite']
      ]
    ]
  ])('changes the table with %s', async (name, expected) => {
    const onValueChange = vi.fn()
    render(
      <TableEditor defaultValue={setTimes} onValueChange={onValueChange} />
    )
    await clickCell('9pm')
    const toolbar = await tableActions()

    await userEvent.click(within(toolbar).getByRole('button', { name }))

    await waitFor(() =>
      expect(grid(tableIn(lastValue(onValueChange)))).toEqual(expected)
    )
  })

  it('presses Header row while the first row is header cells, and toggles it', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    const textbox = await clickCell('9pm')
    const header = within(await tableActions()).getByRole('button', {
      name: 'Header row'
    })
    expect(header).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(header)

    await waitFor(() => expect(header).toHaveAttribute('aria-pressed', 'false'))
    expect(within(textbox).getByText('Time').closest('td')).not.toBe(null)
  })

  it('turns Delete row off in a table of one row', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    await clickCell('9pm')
    const toolbar = await tableActions()
    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Delete row' })
    )

    await waitFor(() =>
      expect(
        within(toolbar).getByRole('button', { name: 'Delete row' })
      ).toHaveAttribute('aria-disabled', 'true')
    )
  })

  it('turns Delete column off in a table of one column', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    await clickCell('9pm')
    const toolbar = await tableActions()
    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Delete column' })
    )

    await waitFor(() =>
      expect(
        within(toolbar).getByRole('button', { name: 'Delete column' })
      ).toHaveAttribute('aria-disabled', 'true')
    )
  })

  it.each([
    ['the first row and column', 'Time'],
    ['the last row and column', 'Ochre Kite']
  ])(
    'keeps Delete row and Delete column on with the caret in %s',
    async (_, text) => {
      render(<TableEditor defaultValue={setTimes} />)
      await clickCell(text)
      const toolbar = await tableActions()

      for (const name of ['Delete row', 'Delete column']) {
        await waitFor(() =>
          expect(within(toolbar).getByRole('button', { name })).toHaveAttribute(
            'aria-disabled',
            'false'
          )
        )
      }
    }
  )

  it.each([
    ['Add row above'],
    ['Add row below'],
    ['Add column before'],
    ['Add column after'],
    ['Delete row'],
    ['Delete column'],
    ['Header row'],
    ['Delete table']
  ])('undoes %s', async (name) => {
    const onValueChange = vi.fn()
    render(
      <TableEditor defaultValue={setTimes} onValueChange={onValueChange} />
    )
    await clickCell('9pm')
    const before = grid(tableIn(setTimes))

    await userEvent.click(
      within(await tableActions()).getByRole('button', { name })
    )
    await waitFor(() =>
      expect(grid(tableIn(lastValue(onValueChange)))).not.toEqual(before)
    )
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)

    await waitFor(() =>
      expect(grid(tableIn(lastValue(onValueChange)))).toEqual(before)
    )
  })

  it('deletes the table, hiding its actions', async () => {
    const onValueChange = vi.fn()
    render(
      <TableEditor defaultValue={setTimes} onValueChange={onValueChange} />
    )
    const textbox = await clickCell('9pm')

    await userEvent.click(
      within(await tableActions()).getByRole('button', { name: 'Delete table' })
    )

    await waitFor(() => expect(textbox.querySelector('table')).toBe(null))
    expect(tableIn(lastValue(onValueChange))).toBe(undefined)
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Table actions' })).toBe(
        null
      )
    )
  })

  it('moves focus to the table actions with Alt+F10, and back to the cell with Escape', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    const textbox = await clickCell('9pm')
    const toolbar = await tableActions()

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    expect(
      within(toolbar).getByRole('button', { name: 'Add row above' })
    ).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(textbox).toHaveFocus())
  })

  it('roves the table actions with the arrow keys the first time they show', async () => {
    render(<TableEditor defaultValue={setTimes} />)
    await clickCell('9pm')
    const toolbar = await tableActions()

    await userEvent.keyboard('{Alt>}{F10}{/Alt}{ArrowRight}')

    expect(
      within(toolbar).getByRole('button', { name: 'Add row below' })
    ).toHaveFocus()
    expect(
      within(toolbar)
        .getAllByRole('button')
        .filter((button) => button.tabIndex === 0)
    ).toHaveLength(1)
  })

  it('keeps the table actions off the Formatting toolbar when a table comes first, at 375px', async () => {
    await page.viewport(375, 700)
    onTestFinished(() => page.viewport(1280, 800))
    render(<TableEditor defaultValue={setTimes} />)
    await clickCell('Time')
    const actions = await tableActions()
    const formatting = screen.getByRole('toolbar', { name: 'Formatting' })

    await waitFor(() => {
      const a = actions.getBoundingClientRect()
      const b = formatting.getBoundingClientRect()
      const overlaps =
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom
      expect(a.width).toBeGreaterThan(0)
      expect(overlaps).toBe(false)
    })
  })

  it.each<[string, Partial<EditorProps>]>([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }]
  ])('hides the table actions when the editor turns %s', async (_, props) => {
    const { rerender } = render(<TableEditor defaultValue={setTimes} />)
    await clickCell('9pm')
    await tableActions()

    rerender(<TableEditor defaultValue={setTimes} {...props} />)

    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Table actions' })).toBe(
        null
      )
    )
  })

  it('keeps each item of a list pasted in a cell as a paragraph in it', async () => {
    const onValueChange = vi.fn()
    render(<TableEditor onValueChange={onValueChange} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)
    const clipboardData = new DataTransfer()
    // As Word writes a list in a cell.
    clipboardData.setData(
      'text/html',
      [
        '<table class="MsoTableGrid"><tr>',
        '<td><p class="MsoNormal">Bar</p></td>',
        '<td><ul><li><p class="MsoNormal">Beer</p></li><li>Wine</li></ul>',
        '<ol><li>Cider</li></ol></td>',
        '</tr></table>'
      ].join('')
    )
    clipboardData.setData('text/plain', 'Bar Beer Wine Cider')

    textbox.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      })
    )

    await waitFor(() => expect(textbox).toHaveTextContent('Cider'))
    const { doc } = lastValue(onValueChange)
    const table = tableIn(lastValue(onValueChange))
    expect(grid(table)).toEqual([['td:Bar', 'td:BeerWineCider']])
    expect(
      table!.content![0]!.content![1]!.content!.map(
        (paragraph) => paragraph.content?.[0]?.text
      )
    ).toEqual(['Beer', 'Wine', 'Cider'])
    expect(doc.content!.map((node) => node.type)).not.toContain('bulletList')
  })

  it('shows the table actions only once focus is in the editor', async () => {
    const probe: ReturnType<typeof useEditorContext> = { editor: null }
    function Probe() {
      probe.editor = useEditorContext().editor
      return null
    }
    render(
      <>
        <button type='button'>Elsewhere</button>
        <TableEditor defaultValue={setTimes}>
          <Editor.Toolbar />
          <Editor.Content />
          <Probe />
        </TableEditor>
      </>
    )
    await waitFor(() => expect(probe.editor).not.toBe(null))
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    let inCell = 0
    probe.editor!.state.doc.descendants((node, pos) => {
      if (!inCell && node.type.name === 'tableCell') inCell = pos + 2
    })

    probe.editor!.commands.setTextSelection(inCell)
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(screen.queryByRole('toolbar', { name: 'Table actions' })).toBe(null)
    probe.editor!.commands.focus()
    await tableActions()
  })

  it('saves no widths, alignment or styles after editing a table', async () => {
    const onValueChange = vi.fn()
    render(<TableEditor onValueChange={onValueChange} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(textbox)
    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    const toolbar = await tableActions()

    for (const name of ['Add column after', 'Add row below', 'Header row']) {
      await userEvent.click(within(toolbar).getByRole('button', { name }))
    }
    await userEvent.keyboard('Doors')

    await waitFor(() =>
      expect(JSON.stringify(lastValue(onValueChange))).toContain('Doors')
    )
    const saved = JSON.stringify(lastValue(onValueChange))
    expect(saved).not.toMatch(/colwidth|align|style/)
    expect(grid(tableIn(lastValue(onValueChange)))).toHaveLength(4)
  })

  it('outlines each cell and tints the selected cells', async () => {
    const probe: ReturnType<typeof useEditorContext> = { editor: null }
    function Probe() {
      probe.editor = useEditorContext().editor
      return null
    }
    render(
      <TableEditor defaultValue={setTimes}>
        <Editor.Toolbar />
        <Editor.Content />
        <Probe />
      </TableEditor>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const time = within(textbox).getByText('Time').closest('th')!
    const act = within(textbox).getByText('Ochre Kite').closest('td')!
    const before = getComputedStyle(act).backgroundColor

    expect(getComputedStyle(time).borderInlineStartWidth).toBe('1px')
    expect(getComputedStyle(act).borderInlineEndStyle).toBe('solid')

    await waitFor(() => expect(probe.editor).not.toBe(null))
    const cells: number[] = []
    probe.editor!.state.doc.descendants((node, pos) => {
      const { name } = node.type
      if (name === 'tableCell' || name === 'tableHeader') cells.push(pos)
    })
    probe.editor!.commands.setCellSelection({
      anchorCell: cells[0]!,
      headCell: cells.at(-1)!
    })

    await waitFor(() => expect(act).toHaveClass('selectedCell'))
    expect(getComputedStyle(act).backgroundColor).not.toBe(before)
  })

  it('scrolls a wide table inside the editor rather than widening it', async () => {
    const wide: EditorValue = {
      ...setTimes,
      doc: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: ['Time', 'Stage', 'Act', 'Genre', 'Tickets'].map(
                  (text) => cell('tableHeader', text)
                )
              }
            ]
          }
        ]
      }
    }
    render(
      <div style={{ width: 320 }}>
        <TableEditor defaultValue={wide} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await waitFor(() => expect(textbox.querySelector('table')).not.toBe(null))
    const scroller = textbox.querySelector<HTMLElement>('.prose-scroll')!

    expect(textbox.getBoundingClientRect().width).toBeLessThanOrEqual(320)
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
  })
})
