import { useEffect, useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { withFrames } from '../../css/testUtils'
import { List } from '../List'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { Navigator } from './index'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

let opened = 0
let goBack = () => {}

function Stack() {
  const [detail, setDetail] = useState(false)
  useEffect(() => {
    goBack = () => setDetail(false)
  }, [])
  return (
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value='/shows'>
        <Pane column='list' aria-label='Shows'>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <List>
            <List.Item
              title='The Rolling Kazoos'
              onClick={() => {
                opened += 1
                setDetail(true)
              }}
            />
          </List>
        </Pane>
        <Pane reached={detail} aria-label='Show'>
          <Pane.Header onBack={() => setDetail(false)}>
            <Pane.Title>The Rolling Kazoos</Pane.Title>
          </Pane.Header>
        </Pane>
      </Navigator>
    </div>
  )
}

const paneLeft = (label: string) =>
  document
    .querySelector(`[data-slot="pane"][aria-label="${label}"]`)!
    .getBoundingClientRect().left

const nextFrame = () => new Promise(requestAnimationFrame)

async function untilFrame(done: () => boolean) {
  await withFrames(async () => {
    while (!done()) await nextFrame()
  })
}

const click = (x: number, y: number) =>
  commands.pointer([{ type: 'move', x, y }, { type: 'down' }, { type: 'up' }])

describe('a phone push', () => {
  it("doesn't open the leaving pane's row again on a quick second tap, and the row opens once the pane is back", async () => {
    await page.viewport(390, 844)
    opened = 0
    render(<Stack />)
    // The row's first paint doesn't slide, so the push waits a frame or two.
    await withFrames(async () => {
      await nextFrame()
      await nextFrame()
    })
    const row = screen.getByRole('button', { name: 'The Rolling Kazoos' })
    const box = row.getBoundingClientRect()
    const y = box.top + box.height / 2

    await click(box.left + 8, y)
    expect(opened).toBe(1)
    await untilFrame(() => paneLeft('Shows') < 0)
    // Still sliding: the row shows at the screen's start edge.
    expect(paneLeft('Show')).toBeGreaterThan(40)
    await click(8, y)
    await untilFrame(() => paneLeft('Show') === 0)
    expect(opened).toBe(1)

    goBack()
    await untilFrame(() => paneLeft('Shows') === 0 && paneLeft('Show') >= 390)
    await withFrames(() =>
      Promise.all(document.getAnimations().map((a) => a.finished))
    )
    await click(box.left + 8, y)
    expect(opened).toBe(2)
  })

  it('leaves the list taking taps beside the detail on a wide screen', async () => {
    await page.viewport(1280, 800)
    opened = 0
    render(<Stack />)
    await withFrames(async () => {
      await nextFrame()
      await nextFrame()
    })
    const row = screen.getByRole('button', { name: 'The Rolling Kazoos' })
    const box = row.getBoundingClientRect()
    const y = box.top + box.height / 2

    await click(box.left + 8, y)
    await untilFrame(() => paneLeft('Show') < 1280)
    expect(paneLeft('Show')).toBeGreaterThan(box.right)
    // A few frames, as the next tap on a row in view comes soon after.
    await withFrames(async () => {
      for (let frame = 0; frame < 3; frame++) await nextFrame()
    })
    await click(box.left + 8, y)
    expect(opened).toBe(2)
  })
})
