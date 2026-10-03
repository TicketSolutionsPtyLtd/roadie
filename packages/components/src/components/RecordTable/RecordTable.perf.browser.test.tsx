import type { ReactNode } from 'react'

import { type Root, createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { countRenders } from './renderCounter'
import { showColumns } from './testUtils'

declare module 'vitest/browser' {
  interface BrowserCommands {
    throttleCpu: (rate: number) => Promise<void>
    renderMetrics: () => Promise<{ styleMs: number; layoutMs: number }>
  }
}

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await commands.throttleCpu(4)
})
afterAll(async () => {
  await commands.throttleCpu(1)
  removeStylesheet()
})
let activeRoot: Root | undefined
let activeContainer: HTMLElement | undefined
afterEach(() => {
  activeRoot?.unmount()
  activeContainer?.remove()
  activeRoot = undefined
  activeContainer = undefined
})

const frame = () => new Promise<number>(requestAnimationFrame)

// Production React has no `act`; two settling frames keep mount cost out of the measurements.
async function mount(node: ReactNode) {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  activeRoot.render(node)
  await frame()
  await frame()
  return activeContainer
}

/** An app screen about 30,000 elements large, with the table in a Pane. */
function AppPage({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div style={{ width }}>
      <Navigator value='shows'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='shows'>Shows</Navigator.Item>
          <Navigator.Item value='orders'>Orders</Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <div className='grid gap-4'>
            {children}
            {Array.from({ length: 2000 }, (_, index) => (
              <section key={index} className='grid gap-1'>
                <h3>Section {index}</h3>
                {Array.from({ length: 4 }, (_, line) => (
                  <p key={line}>
                    <span>Line</span> <b>{line}</b>
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Pane>
      </Navigator>
    </div>
  )
}

async function styleCost(run: () => Promise<void> | void) {
  const before = await commands.renderMetrics()
  await run()
  await frame()
  await frame()
  const after = await commands.renderMetrics()
  return after.styleMs - before.styleMs
}

async function until(check: () => boolean) {
  const start = performance.now()
  while (!check() && performance.now() - start < 5000)
    await new Promise((resolve) => setTimeout(resolve, 0))
}

const panel = () => document.querySelector('[data-slot="records-options"]')

async function clickToPaint(click: () => void, opened: () => boolean) {
  const start = performance.now()
  click()
  await until(opened)
  await new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0))
  )
  return performance.now() - start
}

describe('RecordTable performance', () => {
  it('opens and closes Configure table on a large app page in a few frames', async () => {
    const container = await mount(
      <AppPage width={1440}>
        <RecordTable
          caption='Shows'
          data={testShows(50)}
          fields={showFields}
          columns={showColumns}
          getRowId={(row) => row.id}
        />
      </AppPage>
    )
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Configure table"]'
    )!
    let renders: Record<string, number> = {}
    let latency = 0
    const opening = await styleCost(async () => {
      renders = await countRenders(async () => {
        latency = await clickToPaint(
          () => button.click(),
          () => panel() !== null
        )
      })
    })
    const closing = await styleCost(async () => {
      panel()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await until(() => panel() === null)
    })
    expect(latency).toBeLessThanOrEqual(300)
    expect(opening).toBeLessThanOrEqual(150)
    expect(closing).toBeLessThanOrEqual(150)
    expect(renders.RecordTableRow ?? 0).toBe(0)
  })
})
