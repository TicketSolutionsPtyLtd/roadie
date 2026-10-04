import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

type PictureShow = TestShow & { image?: string }

const PICTURE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="teal"/%3E%3C/svg%3E'

const shows: PictureShow[] = testShows(12).map((show, index) => ({
  ...show,
  image: index % 3 === 0 ? undefined : PICTURE
}))

const fields = [
  ...showFields,
  recordFields<PictureShow>().text('image', {
    label: 'Image',
    searchable: false,
    sortable: false
  })
]
const column = tableColumns<PictureShow>(fields)
const columns = [
  column.field('image', { kind: 'image' }),
  column.field('show', { narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold')
]

const cardColumns = [
  columns[0]!,
  columns[1]!,
  column.field('city', {
    narrow: 'description',
    cell: ({ row }) => (
      <span className='truncate'>
        Fri 27 Nov 2026, 7:30pm at The Lantern Room, {row.city}
      </span>
    )
  }),
  column.field('sold', { narrow: 'trailing' }),
  column.field('gross', { narrow: 'detail' })
]

function Boxed({ width, cards = false }: { width: number; cards?: boolean }) {
  return (
    <div style={{ width, height: 600, overflowY: 'auto' }}>
      <RecordTable
        caption='Shows'
        data={shows}
        fields={fields}
        columns={cards ? cardColumns : columns}
        getRowHref={(row) => `/shows/${row.id}`}
        selectable
      />
    </div>
  )
}

const all = (container: HTMLElement, selector: string) => [
  ...container.querySelectorAll<HTMLElement>(selector)
]

describe('RecordTable image columns in a browser', () => {
  it('keeps wide rows at their fixed height with a 40px thumbnail', async () => {
    const { container } = render(<Boxed width={900} />)
    await expect
      .poll(() => all(container, '[data-slot="record-table-row"]').length)
      .toBe(12)
    for (const row of all(container, '[data-slot="record-table-row"]'))
      expect(row.getBoundingClientRect().height).toBe(48)
    const thumbs = all(
      container,
      '[data-slot="record-table-row"] img, [data-slot="record-table-row"] [data-slot="record-image-placeholder"]'
    )
    expect(thumbs).toHaveLength(12)
    for (const thumb of thumbs) {
      const box = thumb.getBoundingClientRect()
      expect([box.width, box.height]).toEqual([40, 40])
      const cell = thumb.closest<HTMLElement>('[role="cell"]')!
      // Inside the padding, so it never crowds the next column.
      expect(box.right).toBeLessThanOrEqual(
        cell.getBoundingClientRect().right -
          parseFloat(getComputedStyle(cell).paddingRight)
      )
    }
  })

  it('keeps list rows at their fixed height with a leading thumbnail', async () => {
    const { container } = render(<Boxed width={360} />)
    await expect
      .poll(() => all(container, '[data-slot="record-table-list-row"]').length)
      .toBe(12)
    for (const row of all(container, '[data-slot="record-table-list-row"]')) {
      expect(row.getBoundingClientRect().height).toBe(64)
      const leading = row.querySelector<HTMLElement>(
        '[data-slot="list-item-leading"] > *'
      )!
      expect(leading.getBoundingClientRect().height).toBe(40)
    }
  })

  it('fits a card and its banner to the list, whatever the description', async () => {
    const { container } = render(<Boxed width={360} cards />)
    await expect
      .poll(() => all(container, '[data-slot="record-table-card"]').length)
      .toBeGreaterThan(0)
    const list = container.querySelector('ul')!.getBoundingClientRect()
    for (const card of all(container, '[data-slot="record-card"]')) {
      expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(list.width)
      const banner = card
        .querySelector('[data-slot="record-card-media"] > *')!
        .getBoundingClientRect()
      expect(banner.height).toBeCloseTo((banner.width * 9) / 16, 0)
      // With a banner, the trailing value sits on the image's top end.
      const trailing = card
        .querySelector('[data-slot="record-card-trailing"]')!
        .getBoundingClientRect()
      const media = card
        .querySelector('[data-slot="record-card-media"]')!
        .getBoundingClientRect()
      expect(trailing.right).toBeLessThanOrEqual(media.right)
      expect(trailing.top).toBeGreaterThanOrEqual(media.top)
      expect(trailing.bottom).toBeLessThanOrEqual(media.bottom)
      const header = card
        .querySelector('[data-slot="card-header"]')!
        .getBoundingClientRect()
      for (const slot of ['card-title', 'card-description']) {
        const text = card
          .querySelector(`[data-slot="${slot}"]`)!
          .getBoundingClientRect()
        expect(text.right).toBeLessThanOrEqual(header.right)
      }
      const description = card.querySelector<HTMLElement>(
        '[data-slot="card-description"]'
      )!
      // A nowrap description clips at the trailing slot rather than running under it.
      expect(getComputedStyle(description).overflowX).toBe('hidden')
    }
  })
})
