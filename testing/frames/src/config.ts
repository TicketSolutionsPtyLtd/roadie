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

// EXPERIMENT (INNO-1760): main-thread rendering work, style and layout forced
// synchronously over DOM built the way a virtualised list builds it.
function renderWorkload() {
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:0;top:0;width:1200px;height:800px;overflow:hidden;visibility:hidden'
  document.body.append(host)
  const start = performance.now()
  let size = 0
  for (let round = 0; round < 12; round++) {
    const grid = document.createElement('div')
    grid.style.cssText = `display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:${round % 3}px`
    for (let i = 0; i < 160; i++) {
      const card = document.createElement('div')
      card.style.cssText =
        'display:grid;gap:4px;padding:12px;border:1px solid;border-radius:8px'
      const title = document.createElement('p')
      title.style.fontWeight = '600'
      title.textContent = `Show ${(i * 7919) % 2000} at the venue`
      const city = document.createElement('p')
      city.textContent = `City ${i}`
      const details = document.createElement('div')
      details.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap'
      for (const value of [(i * 31) % 997, (i * 13) % 5000]) {
        const item = document.createElement('span')
        item.textContent = `${value} sold`
        details.append(item)
      }
      card.append(title, city, details)
      grid.append(card)
    }
    host.replaceChildren(grid)
    size += host.scrollHeight
    host.style.width = `${1100 + round * 7}px`
    size += grid.offsetHeight
  }
  host.remove()
  return [performance.now() - start, size]
}

async function median(page: Page, run: () => number[]) {
  const times: number[] = []
  for (let i = 0; i < 7; i++) {
    const [ms] = await page.evaluate(run)
    times.push(ms!)
  }
  return times.sort((a, b) => a - b)[3]!
}

let probe: Promise<Record<string, unknown>> | undefined

/** EXPERIMENT: this machine's CPU and its times for both workloads at rate 1. */
const calibrationProbe: BrowserCommand<[]> = async ({ page }) => {
  if (!isChromium(page)) return {}
  const session = await devtools(page)
  probe ??= (async () => {
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    const { cpus } = await import('node:os')
    const jsMs = await median(page, workload)
    const renderMs = await median(page, renderWorkload)
    const result = {
      model: cpus()[0]?.model,
      cores: cpus().length,
      jsMs,
      renderMs
    }
    console.log(`Perf probe: ${JSON.stringify(result)}`)
    return result
  })()
  return probe
}

/** EXPERIMENT: Chromium's running main-thread totals, in ms. */
const taskMetrics: BrowserCommand<[]> = async ({ page }) => {
  if (!isChromium(page)) return {}
  const { metrics } = await (
    await devtools(page)
  ).send('Performance.getMetrics')
  return Object.fromEntries(
    [
      'TaskDuration',
      'ScriptDuration',
      'RecalcStyleDuration',
      'LayoutDuration'
    ].map((name) => [
      name,
      (metrics.find((metric) => metric.name === name)?.value ?? 0) * 1000
    ])
  )
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

const recordFrames: BrowserCommand<[record: FrameRecord]> = (_, record) => {
  const file = process.env.ROADIE_PERF_REPORT
  if (file) appendFileSync(file, `${JSON.stringify(record)}\n`)
}

// From the server, since Vitest drops what a passing test logs in the page.
const printFrameNotices: BrowserCommand<[lines: string[]]> = (_, lines) => {
  if (lines.length) console.log(lines.join('\n'))
}

type ProfileNode = {
  id: number
  callFrame: { functionName: string; url: string; lineNumber: number }
}

/**
 * Samples the main thread between `start` and `stop`, and resolves the
 * functions that spent the most time themselves, for finding why a run is slow.
 */
const profileCpu: BrowserCommand<
  [action: 'start' | 'stop', top?: number]
> = async ({ page }, action, top = 25) => {
  if (!isChromium(page)) return []
  const session = await devtools(page)
  if (action === 'start') {
    await session.send('Profiler.enable')
    await session.send('Profiler.setSamplingInterval', { interval: 200 })
    await session.send('Profiler.start')
    return []
  }
  const { profile } = await session.send('Profiler.stop')
  const nodes = new Map(
    (profile.nodes as ProfileNode[]).map((node) => [node.id, node])
  )
  const self = new Map<string, number>()
  profile.samples?.forEach((id, index) => {
    const { functionName, url, lineNumber } = nodes.get(id)!.callFrame
    const key = `${functionName || '(anonymous)'} ${url.split('/').slice(-2).join('/')}:${lineNumber + 1}`
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas?.[index] ?? 0))
  })
  return [...self]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([where, us]) => `${(us / 1000).toFixed(1)}ms ${where}`)
}

export const frameCommands = {
  calibrationProbe,
  taskMetrics,
  throttleCpu,
  renderMetrics,
  recordFrames,
  printFrameNotices,
  profileCpu
}

const perfBrowsers = () =>
  (process.env.ROADIE_PERF_BROWSERS ?? 'chromium')
    .split(',')
    .map((name) => name.trim() as 'chromium' | 'webkit' | 'firefox')

export const perfInstances = () =>
  perfBrowsers().map((browser) => ({ browser }))

// CI runners have no GPU, so Chromium composites and rasterises in software
// there. It does here too, so a miss in CI is one you can see locally.
export const perfLaunchOptions = () => ({
  args: perfBrowsers().every((browser) => browser === 'chromium')
    ? ['--disable-gpu']
    : []
})
