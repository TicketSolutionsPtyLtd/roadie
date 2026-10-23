import type { ComponentProps, ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Card } from '../components/Card'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { useStylesheet } from '../components/Pane/testUtils'
import { RecordTable, tableColumns } from '../components/RecordTable'
import {
  type TestShow,
  showFields,
  testShows
} from '../components/Records/testUtils'

// The states are the settled ones, so no test waits on a transition to land.
const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  await commands.pointer([{ type: 'up' }, { type: 'move', x: 0, y: 0 }])
  cleanup()
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

const columns: DataTableColumn[] = [
  { key: 'pool', header: 'Pool', kind: 'text' },
  { key: 'gate', header: 'Gate', kind: 'text' },
  { key: 'scans', header: 'Scans', kind: 'number' }
]
const rows = [
  { pool: 'General', gate: 'North', scans: 250 },
  { pool: 'General', gate: 'South', scans: 150 }
]

const column = tableColumns<TestShow>(showFields)
const listColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' })
]

type CardProps = Pick<ComponentProps<typeof Card>, 'emphasis' | 'variant'>

function Surface({
  cardLink = false,
  children,
  ...props
}: CardProps & { cardLink?: boolean; children: ReactNode }) {
  return (
    <div style={{ padding: 24, width: 360 }}>
      <Card {...props}>
        <Card.Content>
          {cardLink && (
            <Card.Title>
              <Card.Link href='#gates'>Gates</Card.Link>
            </Card.Title>
          )}
          {children}
        </Card.Content>
      </Card>
    </div>
  )
}

const groupedTable = (
  <DataTable caption='Scans' columns={columns} rows={rows} groupBy={['pool']} />
)

const card = () => document.querySelector<HTMLElement>('[data-slot=card]')!
const groupToggle = () =>
  document.querySelector<HTMLElement>(
    '[data-slot=data-table-group] [data-interactive-target]'
  )!
const cardLink = () =>
  document.querySelector<HTMLElement>('[data-slot=card-link]')!

function look(element: HTMLElement) {
  const style = getComputedStyle(element)
  return {
    transform: style.transform,
    background: style.backgroundColor,
    shadow: style.boxShadow,
    outline: style.outlineWidth,
    fill: style.getPropertyValue('--card-fill'),
    edgeShadow: style.getPropertyValue('--card-shadow-2')
  }
}

const centre = (element: HTMLElement) => {
  element.scrollIntoView({ block: 'center' })
  const { x, y, width, height } = element.getBoundingClientRect()
  return { x: x + width / 2, y: y + height / 2 }
}

async function press(element: HTMLElement) {
  await commands.pointer([
    { type: 'move', ...centre(element) },
    { type: 'down' }
  ])
  await frame()
}

async function hover(element: HTMLElement) {
  await commands.pointer([{ type: 'move', ...centre(element) }])
  await frame()
}

// Tab skips buttons and links in WebKit and in macOS Firefox by default.
async function focusByKeyboard(element: HTMLElement) {
  element.blur()
  await userEvent.keyboard('{Shift}')
  element.focus({ focusVisible: true })
  await frame()
}

const surfaces: [string, CardProps][] = [
  ['normal', { emphasis: 'normal' }],
  ['raised', { emphasis: 'raised' }],
  ['subtle', { emphasis: 'subtle' }],
  ['subtler', { emphasis: 'subtler' }],
  ['raised ticket', { variant: 'ticket', emphasis: 'raised' }],
  ['normal ticket', { variant: 'ticket', emphasis: 'normal' }],
  ['subtler ticket', { variant: 'ticket', emphasis: 'subtler' }]
]

describe('is-interactive-within around another is-interactive-within', () => {
  describe.each(surfaces)(
    'a %s card around a grouped DataTable',
    (_name: string, props: CardProps) => {
      it('stays still while a group toggle is pressed', async () => {
        render(<Surface {...props}>{groupedTable}</Surface>)
        const rest = look(card())

        await press(groupToggle())
        expect(groupToggle().matches(':active')).toBe(true)
        expect(look(card())).toEqual(rest)
      })

      it('stays still while a group toggle is hovered', async () => {
        render(<Surface {...props}>{groupedTable}</Surface>)
        const rest = look(card())

        await hover(groupToggle())
        expect(groupToggle().matches(':hover')).toBe(true)
        expect(look(card())).toEqual(rest)
      })

      it('shows no ring while a group toggle has keyboard focus', async () => {
        render(<Surface {...props}>{groupedTable}</Surface>)
        const rest = look(card())

        await focusByKeyboard(groupToggle())
        expect(groupToggle().matches(':focus-visible')).toBe(true)
        expect(look(card())).toEqual(rest)
      })

      it('keeps its rest fill with no main link of its own', () => {
        render(
          <>
            <Surface {...props}>{groupedTable}</Surface>
            <Surface {...props}>
              <p>Gates</p>
            </Surface>
          </>
        )
        const [nested, plain] = [
          ...document.querySelectorAll<HTMLElement>('[data-slot=card]')
        ]

        expect(look(nested!)).toEqual(look(plain!))
      })
    }
  )

  describe('a card with its own Card.Link around a grouped DataTable', () => {
    it('still presses, lifts and rings for its own link', async () => {
      render(
        <Surface emphasis='normal' cardLink>
          {groupedTable}
        </Surface>
      )
      const rest = look(card())

      await hover(cardLink())
      expect(look(card()).transform).not.toBe(rest.transform)
      expect(look(card()).background).not.toBe(rest.background)

      await press(cardLink())
      expect(new DOMMatrix(look(card()).transform).a).toBeCloseTo(0.99)

      await commands.pointer([{ type: 'up' }, { type: 'move', x: 0, y: 0 }])
      await focusByKeyboard(cardLink())
      expect(parseFloat(look(card()).outline)).toBeGreaterThan(0)
    })

    it('stays still for the group toggle', async () => {
      render(
        <Surface emphasis='normal' cardLink>
          {groupedTable}
        </Surface>
      )
      const rest = look(card())

      await press(groupToggle())
      expect(look(card())).toEqual(rest)
    })

    it('keeps its own ring while the pointer rests on a group toggle', async () => {
      render(
        <Surface emphasis='normal' cardLink>
          {groupedTable}
        </Surface>
      )
      await focusByKeyboard(cardLink())
      const focused = look(card())

      await hover(groupToggle())
      expect(look(card())).toEqual(focused)
    })
  })

  describe('a card around RecordTable list rows', () => {
    function renderList() {
      render(
        <Surface emphasis='normal'>
          <div style={{ width: 300 }}>
            <RecordTable
              caption='Shows'
              fields={showFields}
              columns={listColumns}
              data={testShows(3)}
              getRowId={(row) => row.id}
              getRowHref={(row) => `#${row.id}`}
            />
          </div>
        </Surface>
      )
    }
    const rowLink = async () => {
      await expect
        .poll(() => document.querySelector('[data-row-link]'))
        .not.toBeNull()
      return document.querySelector<HTMLElement>('[data-row-link]')!
    }
    const listRow = () =>
      document.querySelector<HTMLElement>(
        '[data-slot=record-table-list-row] > .is-interactive-within'
      )!

    it('stays still while a row is pressed, and the row takes it', async () => {
      renderList()
      const link = await rowLink()
      const rest = look(card())
      const rowRest = look(listRow())

      await press(link)
      expect(look(card())).toEqual(rest)
      expect(look(listRow()).background).not.toBe(rowRest.background)
    })

    it('stays still while a row is hovered', async () => {
      renderList()
      const link = await rowLink()
      const rest = look(card())

      await hover(link)
      expect(look(card())).toEqual(rest)
    })
  })
})
