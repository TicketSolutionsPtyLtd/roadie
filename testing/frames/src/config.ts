import type {} from '@vitest/browser-playwright'
import { appendFileSync } from 'node:fs'
import type { CDPSession, Page } from 'playwright'
import type { BrowserCommand } from 'vitest/node'

import type { FrameRecord } from './record'

const sessions = new WeakMap<Page, Promise<CDPSession>>()

const isChromium = (page: Page) =>
  page.context().browser()?.browserType().name() === 'chromium'

// One session per page, kept open: detaching drops its overrides.
function devtools(page: Page) {
  let session = sessions.get(page)
  if (!session) {
    session = page
      .context()
      .newCDPSession(page)
      .then(async (created) => {
        await created.send('Performance.enable')
        return created
      })
    sessions.set(page, session)
  }
  return session
}

// Main-thread work that takes REFERENCE_MS on the laptop the budgets were set
// on (an M4 Pro) slowed 4x, so a slower CI runner gets less throttling and
// every machine runs the tests at about the same speed.
const REFERENCE_MS = 84

function workload() {
  const start = performance.now()
  const rows = Array.from({ length: 60_000 }, (_, id) => ({
    id,
    name: `Show ${(id * 7919) % 60_000}`,
    sold: (id * 31) % 997
  }))
  rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  const copy: typeof rows = JSON.parse(JSON.stringify(rows))
  let sold = 0
  for (const row of copy) sold += row.sold
  return [performance.now() - start, sold]
}

let calibration: Promise<number> | undefined

/** The rate that makes this machine run the workload in REFERENCE_MS. */
function calibrate(page: Page, session: CDPSession) {
  calibration ??= (async () => {
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    const times: number[] = []
    for (let run = 0; run < 7; run++) {
      const [ms] = await page.evaluate(workload)
      times.push(ms!)
    }
    const median = times.sort((a, b) => a - b)[3]!
    const rate = Math.max(1, Math.round((REFERENCE_MS / median) * 10) / 10)
    console.log(
      `Perf CPU: ${rate}x, as the workload took ${Math.round(median)}ms of ${REFERENCE_MS}ms`
    )
    return rate
  })()
  return calibration
}

function requestedRate() {
  const value = process.env.ROADIE_PERF_CPU
  if (value === undefined || value === '' || value === 'calibrated')
    return undefined
  const rate = Number(value)
  if (!(rate >= 1)) throw new Error(`ROADIE_PERF_CPU must be 1 or more`)
  return rate
}

/**
 * Slows Chromium's main thread and resolves the rate it set: `rate`, else
 * ROADIE_PERF_CPU, else the calibrated rate. Other engines can't be slowed and
 * resolve 1.
 */
const throttleCpu: BrowserCommand<[rate?: number]> = async ({ page }, rate) => {
  if (!isChromium(page)) return 1
  const session = await devtools(page)
  const applied = rate ?? requestedRate() ?? (await calibrate(page, session))
  await session.send('Emulation.setCPUThrottlingRate', { rate: applied })
  return applied
}

/** Chromium's running style and layout totals for the page, in ms. */
const renderMetrics: BrowserCommand<[]> = async ({ page }) => {
  if (!isChromium(page)) return { styleMs: 0, layoutMs: 0 }
  const { metrics } = await (
    await devtools(page)
  ).send('Performance.getMetrics')
  const value = (name: string) =>
    metrics.find((metric) => metric.name === name)?.value ?? 0
  return {
    styleMs: value('RecalcStyleDuration') * 1000,
    layoutMs: value('LayoutDuration') * 1000
  }
}

/** Appends a measured run to ROADIE_PERF_REPORT, one JSON object a line. */
const recordFrames: BrowserCommand<[record: FrameRecord]> = (_, record) => {
  const file = process.env.ROADIE_PERF_REPORT
  if (file) appendFileSync(file, `${JSON.stringify(record)}\n`)
}

export const frameCommands = { throttleCpu, renderMetrics, recordFrames }

const perfBrowsers = () =>
  (process.env.ROADIE_PERF_BROWSERS ?? 'chromium')
    .split(',')
    .map((name) => name.trim() as 'chromium' | 'webkit' | 'firefox')

/** The engines a perf project runs in: ROADIE_PERF_BROWSERS, else Chromium. */
export const perfInstances = () =>
  perfBrowsers().map((browser) => ({ browser }))

// CI runners have no GPU, so Chromium composites and rasterises in software
// there. It does here too, so a miss in CI is one you can see locally.
export const perfLaunchOptions = () => ({
  args: perfBrowsers().every((browser) => browser === 'chromium')
    ? ['--disable-gpu']
    : []
})
