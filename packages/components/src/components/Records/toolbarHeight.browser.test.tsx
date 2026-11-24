import { type ReactNode, use } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'
import { RecordsContext } from './context'
import { type TestShow, showFields, testShows } from './testUtils'

const TIMEOUT = { timeout: 30_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await page.viewport(1024, 768)
})

const column = tableColumns<TestShow>(showFields)
const layouts = [
  tableLayout([
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('status')
  ])
]

let probeRenders = 0
/** Renders whenever the Records context changes, as every part reading it does. */
function Probe() {
  use(RecordsContext)
  probeRenders++
  return null
}

const toolbar = (
  <>
    <Records.Search className='min-w-40 grow basis-0' />
    <div data-slot='test-spacer' className='w-px' />
  </>
)

type Shape = 'pane' | 'page' | 'box'

function Shows({ shape }: { shape: Shape }) {
  const records = useRecords({
    data: testShows(80),
    fields: showFields,
    getRowId: (row) => row.id,
    // Dimmed rows, so a layout shows its sticky progress bar.
    loading: true
  })
  const parts: ReactNode = (
    <>
      <Probe />
      <Records.Header>{toolbar}</Records.Header>
      <Records.Content maxHeight={shape === 'box' ? '300px' : undefined} />
    </>
  )
  if (shape === 'pane')
    return (
      <Records.Provider records={records} layouts={layouts} caption='Shows'>
        <Pane className='h-full'>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>{parts}</Pane.Body>
        </Pane>
      </Records.Provider>
    )
  return (
    <Records.Root records={records} layouts={layouts} caption='Shows'>
      {parts}
    </Records.Root>
  )
}

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)
const top = (element: HTMLElement) => parseFloat(getComputedStyle(element).top)

async function renderAt(width: number, shape: Shape) {
  await page.viewport(width, 800)
  render(
    <div style={{ height: 640, width, display: 'grid' }}>
      <Shows shape={shape} />
    </div>
  )
  await expect
    .poll(() => slot('record-table-head') ?? slot('record-table-progress'))
    .not.toBeNull()
  await nudgeFrames()
}

/** The sticky parts' `top`, in px, with a spacer this tall in the toolbar. */
async function offsetsAt(spacer: number) {
  slot('test-spacer')!.style.height = `${spacer}px`
  const header = slot('records-header')!
  // The spacer is taller than the search, so it sets the toolbar's height.
  await expect.poll(() => header.offsetHeight).toBeGreaterThan(spacer)
  const content = slot('record-table-head') ?? slot('record-table-progress')!
  await nudgeFrames()
  return {
    toolbar: header.offsetHeight,
    header: top(header),
    content: top(content)
  }
}

const SPACERS = [48, 96, 160]

// The offsets as numbers, to compare a run before a change with one after.
const log = (width: number, shape: Shape, spacer: number, at: object) =>
  console.info(JSON.stringify({ width, shape, spacer, ...at }))

describe.each([390, 1280])('Sticky offsets at %ipx', (width) => {
  it(
    'sticks the content under the pane header and the whole toolbar',
    TIMEOUT,
    async () => {
      await renderAt(width, 'pane')
      const paneHeader = slot('pane-header')!.offsetHeight
      for (const spacer of SPACERS) {
        const at = await offsetsAt(spacer)
        expect(at.header).toBe(paneHeader)
        await expect
          .poll(() => offsetsAt(spacer).then(({ content }) => content))
          .toBe(paneHeader + at.toolbar)
        log(width, 'pane', spacer, await offsetsAt(spacer))
      }
    }
  )

  it('sticks the content under the toolbar on the page', TIMEOUT, async () => {
    await renderAt(width, 'page')
    for (const spacer of SPACERS) {
      const at = await offsetsAt(spacer)
      expect(at.header).toBe(0)
      await expect
        .poll(() => offsetsAt(spacer).then(({ content }) => content))
        .toBe(at.toolbar)
      log(width, 'page', spacer, await offsetsAt(spacer))
    }
  })

  it(
    'leaves the toolbar out of a box of the content’s own',
    TIMEOUT,
    async () => {
      await renderAt(width, 'box')
      for (const spacer of SPACERS) {
        const at = await offsetsAt(spacer)
        expect(at.content).toBe(0)
        log(width, 'box', spacer, at)
      }
    }
  )
})

describe('A toolbar resize', () => {
  it.each([390, 1280])(
    'renders no part of the records at %ipx',
    TIMEOUT,
    async (width) => {
      await renderAt(width, 'pane')
      await offsetsAt(48)
      probeRenders = 0
      await offsetsAt(96)
      await offsetsAt(160)
      console.info(`Records renders on two toolbar resizes: ${probeRenders}`)
      expect(probeRenders).toBe(0)
    }
  )
})
