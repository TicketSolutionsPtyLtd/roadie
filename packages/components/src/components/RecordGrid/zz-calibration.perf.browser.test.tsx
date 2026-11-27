// EXPERIMENT (INNO-1760), dropped before merge: RecordGrid's scrolls at the
// JS-calibrated rate, a render-calibrated rate, and unthrottled, on one runner.
import { describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { measureFrames, mount, setupFrameTests } from '@oztix/roadie-frames'

import { RecordGrid } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { showFields, testShows } from '../Records/testUtils'

setupFrameTests({ css: roadieCss, cpuRate: 1 })

const card = {
  title: 'show',
  description: 'city',
  trailing: 'status',
  details: ['sold', 'gross']
} as const

// The M4 Pro's medians at rate 1; it's the reference at 4x, as REFERENCE_MS is.
const LOCAL_JS_MS = 21
const LOCAL_RENDER_MS = 47

const rateFor = (local: number, here: number) =>
  Math.max(1, Math.round(((4 * local) / here) * 10) / 10)

const delta = (a: Record<string, number>, b: Record<string, number>) =>
  Object.fromEntries(Object.keys(b).map((k) => [k, b[k]! - (a[k] ?? 0)]))

describe('calibration probe', () => {
  it('scrolls RecordGrid at each rate', { timeout: 900_000 }, async () => {
    const probe = (await commands.calibrationProbe()) as {
      jsMs: number
      renderMs: number
    }
    const rates = {
      js: rateFor(LOCAL_JS_MS, probe.jsMs),
      render: rateFor(LOCAL_RENDER_MS, probe.renderMs),
      one: 1
    }
    for (let repeat = 0; repeat < 5; repeat++) {
      for (const [label, rate] of Object.entries(rates)) {
        for (const count of [2000, 10_000]) {
          await commands.throttleCpu(1)
          const root = await mount(
            <div style={{ width: 1200 }}>
              <RecordGrid
                data={testShows(count)}
                fields={showFields}
                defaultPosition={{ pageSize: count }}
                maxHeight='800px'
                card={card}
              />
            </div>,
            { frames: 5 }
          )
          const viewport = root.querySelector<HTMLElement>(
            '[data-slot="record-grid-viewport"]'
          )!
          const applied = await commands.throttleCpu(rate)
          const before = await commands.taskMetrics()
          const stats = await measureFrames(() => {
            viewport.scrollTop += 60
          })
          const after = await commands.taskMetrics()
          await commands.throttleCpu(1)
          expect(viewport.scrollTop).toBeGreaterThan(5000)
          await commands.recordFrames({
            ...stats,
            file: 'probe',
            scenario: `RecordGrid ${count} ${label}`,
            pass: true,
            cpu: applied,
            probe: { ...probe, label, repeat, ...delta(before, after) }
          } as never)
        }
      }
    }
  })
})
