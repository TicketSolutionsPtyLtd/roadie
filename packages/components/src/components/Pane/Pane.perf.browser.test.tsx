import { memo, useEffect, useState } from 'react'

import { afterAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import {
  engine,
  expectFrameBudget,
  frame,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { List } from '../List'
import { Navigator } from '../Navigator'
import { withStubLink } from '../Navigator/testUtils'
import { RecordTable } from '../RecordTable'
import { showColumns } from '../RecordTable/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { forgetPaneScroll } from './paneScroll'

setupFrameTests({ css: roadieCss })
afterAll(async () => {
  forgetPaneScroll()
  await page.viewport(1440, 900)
})

const PHONE = [390, 844] as const

const ROWS = Array.from({ length: 200 }, (_, index) => ({
  title: `The Rolling Kazoos, night ${index + 1}`,
  description: ['Kazoo Hollow Room', 'The Tin Lantern', 'Gumleaf Hall'][
    index % 3
  ]
}))
const SHOWS = testShows(100)

type Content = 'empty' | 'rows' | 'table'

// Memoised, so a push re-renders the panes' state, not what they hold.
const Body = memo(function Body({
  content,
  rows = 100
}: {
  content: Content
  rows?: number
}) {
  if (content === 'empty') return null
  if (content === 'table')
    return (
      <RecordTable
        caption='Shows'
        data={SHOWS}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        defaultPosition={{ pageSize: 100 }}
      />
    )
  return (
    <List>
      {ROWS.slice(0, rows).map((row) => (
        <List.Item
          key={row.title}
          title={row.title}
          description={row.description}
          chevron
          onClick={() => {}}
        />
      ))}
    </List>
  )
})

let go: (detail: boolean) => void = () => {}

/** A list pane and a detail pane, with the detail's content mounted by the push when `onPush`, as a route's is. */
function Stack({ content, onPush }: { content: Content; onPush: boolean }) {
  const [detail, setDetail] = useState(false)
  useEffect(() => {
    go = setDetail
  }, [])
  return withStubLink(
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value='/shows'>
        <Navigator.Primary aria-label='Promoter'>
          <Navigator.Item value='/shows' href='/shows'>
            Shows
          </Navigator.Item>
          <Navigator.Item value='/orders' href='/orders'>
            Orders
          </Navigator.Item>
        </Navigator.Primary>
        <Pane column='list' aria-label='Shows'>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Body content={content} />
        </Pane>
        <Pane reached={detail} aria-label='Show'>
          <Pane.Header onBack={() => setDetail(false)} backLabel='Shows'>
            <Pane.Title>The Rolling Kazoos</Pane.Title>
          </Pane.Header>
          {(!onPush || detail) && <Body content={content} />}
        </Pane>
      </Navigator>
    </div>
  )
}

const detailLeft = () =>
  document
    .querySelector('[data-slot="pane"][aria-label="Show"]')!
    .getBoundingClientRect().left

/** Measures a push or pop, with the style recalculation it cost in the note. */
async function measureStep(scenario: string, step: () => void) {
  const before = await commands.renderMetrics()
  const frames = await measureFrames((index) => index === 0 && step(), {
    frames: 60
  })
  await frame()
  const after = await commands.renderMetrics()
  const style = Math.round(after.styleMs - before.styleMs)
  return { scenario, frames, style }
}

// Each cap is the highest of many CI jobs on the same code plus 10%, since a
// push's style time spreads by half its median from job to job (INNO-1704).
// A push of empty panes cost 21 to 50ms of style over 38 jobs (CPU 1.5x to
// 2.9x).
const STYLE_CAP = 55
// A push over 100 rows cost 218 to 259ms of style before INNO-1678, and 83 to
// 144ms over 17 jobs after it.
const CONTENT_STYLE_CAP = 158

const PUSHES: {
  name: string
  content: Content
  onPush: boolean
  styleCap: number
  /** A ticket for a push that still costs more style than its cap. */
  styleMiss?: string
  pushMiss?: string
  popMiss?: string
}[] = [
  { name: 'empty panes', content: 'empty', onPush: false, styleCap: STYLE_CAP },
  {
    name: '100 list rows',
    content: 'rows',
    onPush: false,
    styleCap: CONTENT_STYLE_CAP,
    // Missed in 1 of 17 CI jobs on the same commit (p95 33.3ms, with 123ms of
    // style against 75 to 115ms in the rest): the pop restyles each pane's
    // whole subtree, as the push does.
    popMiss: 'INNO-1706'
  },
  {
    name: 'a RecordTable of 100 the push mounts',
    content: 'table',
    onPush: true,
    styleCap: CONTENT_STYLE_CAP,
    // 145 to 160ms after INNO-1678: each pane's visibility, pointer-events
    // and --pane-back still change over its whole subtree.
    styleMiss: 'INNO-1706'
  }
]

describe('Pane steps through a phone stack at 60fps on a slowed CPU', () => {
  it.each(PUSHES)(
    'pushes and pops a detail pane over $name',
    async ({
      name,
      content,
      onPush,
      styleCap,
      styleMiss,
      pushMiss,
      popMiss
    }) => {
      await page.viewport(...PHONE)
      await mount(<Stack content={content} onPush={onPush} />, { frames: 10 })
      expect(detailLeft()).toBeGreaterThanOrEqual(PHONE[0])
      const push = await measureStep(`Pane phone, ${name}, push`, () =>
        go(true)
      )
      expect(detailLeft()).toBeCloseTo(0, 0)
      const pop = await measureStep(`Pane phone, ${name}, pop`, () => go(false))
      expect(detailLeft()).toBeGreaterThanOrEqual(PHONE[0])
      await expectFrameBudget(push.scenario, push.frames, {
        knownMiss: pushMiss,
        note: `style ${push.style}ms${styleMiss ? `, the ${styleCap}ms cap waived as ${styleMiss}` : ''}`
      })
      await expectFrameBudget(pop.scenario, pop.frames, {
        knownMiss: popMiss,
        note: `style ${pop.style}ms`
      })
      // Only Chromium reports style time.
      if (!styleMiss && engine === 'chromium')
        expect(push.style).toBeLessThanOrEqual(styleCap)
    }
  )
})

describe('Pane scrolls under its translucent chrome at 60fps on a slowed CPU', () => {
  it('scrolls 200 list rows under the header, footer, and tab bar on a phone', async () => {
    await page.viewport(...PHONE)
    const root = await mount(
      withStubLink(
        <div style={{ height: '100vh', display: 'grid' }}>
          <Navigator value='/shows'>
            <Navigator.Primary aria-label='Promoter'>
              <Navigator.Item value='/shows' href='/shows'>
                Shows
              </Navigator.Item>
              <Navigator.Item value='/orders' href='/orders'>
                Orders
              </Navigator.Item>
            </Navigator.Primary>
            <Pane aria-label='Shows'>
              <Pane.Header>
                <Pane.Title>Shows</Pane.Title>
              </Pane.Header>
              <Body content='rows' rows={200} />
              <Pane.Footer>
                <Button intent='accent' emphasis='strong'>
                  Add a show
                </Button>
              </Pane.Footer>
            </Pane>
          </Navigator>
        </div>
      ),
      { frames: 10 }
    )
    const viewport = root.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    const header = root.querySelector<HTMLElement>('[data-slot="pane-header"]')!
    expect(getComputedStyle(header).backdropFilter).not.toBe('none')
    // In CI: p95 16.8ms, 2.5 to 7% dropped, and one 108 to 143ms long task as the
    // scroll starts, which the worst-frame allowance would hide without
    // `longestTask`.
    await expectFrameBudget(
      'Pane phone, 200 list rows under the chrome, scroll',
      await measureFrames(() => {
        viewport.scrollTop += 40
      }),
      { longestTask: 50, knownMiss: 'INNO-1677' }
    )
    // Still scrolling at the end, so no frame measured a pane at rest.
    expect(viewport.scrollTop).toBeGreaterThan(3000)
  })
})
