import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { findScrollParent } from '../Records/scrollParent'
import { showFields, testShows } from '../Records/testUtils'
import { ROW_HEIGHT } from './RecordTableRow'
import { showColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

// Linux WebKit runs no frames while a test sits idle, so each poll wakes them.
const framed = <T,>(read: () => T) =>
  expect.poll(async () => {
    await nudgeFrames()
    return read()
  })

const rows = (container: HTMLElement) =>
  container.querySelectorAll<HTMLElement>('[data-slot="record-table-row"]')

describe('RecordTable virtualised rows', () => {
  it('renders only the rows near the screen of a 10,000 row page in a pane', async () => {
    const { container } = render(
      <div style={{ height: 600, display: 'grid' }}>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <RecordTable
              caption='Shows'
              data={testShows(10_000)}
              fields={showFields}
              columns={showColumns}
              defaultPosition={{ pageSize: 10_000 }}
            />
          </Pane.Body>
        </Pane>
      </div>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    // Re-assigned each poll: the first assignment can clamp to a stale height.
    await framed(() => {
      viewport.scrollTop = viewport.scrollHeight
      return container.textContent?.includes('angie McMahon 1667')
    }).toBe(true)
    expect(rows(container).length).toBeLessThan(80)
    expect(container.querySelector('[role="table"]')).toHaveAttribute(
      'aria-rowcount',
      '10001'
    )
    expect(rows(container).item(rows(container).length - 1)).toHaveAttribute(
      'aria-rowindex',
      '10001'
    )
  })

  it('virtualises against the window when nothing else scrolls', async () => {
    const shows = testShows(300)
    const target = shows[199]!.show
    const { container } = render(
      <div>
        <div style={{ height: 1500 }} />
        <RecordTable
          caption='Shows'
          data={shows}
          fields={showFields}
          columns={showColumns}
          defaultPosition={{ pageSize: 300 }}
        />
      </div>
    )
    const content = container.querySelector<HTMLElement>(
      '[data-slot="record-table-content"]'
    )!
    await framed(() => {
      const documentTop = content.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, documentTop + 199 * ROW_HEIGHT)
      return container.textContent?.includes(target)
    }).toBe(true)
    expect(rows(container).length).toBeLessThan(80)
  })

  it('keeps every row of a page of 100 in the table', () => {
    const { container } = render(
      <RecordTable
        caption='Shows'
        data={testShows(100)}
        fields={showFields}
        columns={showColumns}
        defaultPosition={{ pageSize: 100 }}
      />
    )
    expect(rows(container)).toHaveLength(100)
    expect(container.querySelector('[role="table"]')).not.toHaveAttribute(
      'aria-rowcount'
    )
  })
})

describe('findScrollParent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the nearest ancestor with vertical overflow', () => {
    const parent = document.createElement('div')
    parent.style.overflowY = 'auto'
    const middle = document.createElement('div')
    const child = document.createElement('div')
    middle.append(child)
    parent.append(middle)
    document.body.append(parent)
    expect(findScrollParent(child)).toBe(parent)
  })

  it('returns null when no ancestor scrolls', () => {
    const parent = document.createElement('div')
    const child = document.createElement('div')
    parent.append(child)
    document.body.append(parent)
    expect(findScrollParent(child)).toBeNull()
  })
})
