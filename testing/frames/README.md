# @oztix/roadie-frames

The frame-rate harness for Roadie's `*.perf.browser.test.tsx` files. Tests
only: it's private and never published.

```tsx
import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

setupFrameTests({ css: roadieCss })

it('scrolls 10,000 rows at 60fps', async () => {
  const root = await mount(<Shows count={10_000} />)
  const box = root.querySelector<HTMLElement>('[data-slot="scroller"]')!
  await expectFrameBudget(
    'RecordTable, 10,000 rows, scroll',
    await measureFrames(() => {
      box.scrollTop += 60
    })
  )
})
```

- `measureFrames(step, { frames })` runs `step` at the start of each frame,
  as input would. `measureWhile(run)` counts frames while an async driver
  runs, such as a real pointer through `commands.pointer`.
- `expectFrameBudget` fails when the p95 frame is over 17.5ms (16.7 plus the
  frame clock's jitter) or more than 5% of frames drop, over at least 60
  frames, setting the worst frame aside so one hitch can't fail a run.
  `knownMiss: 'INNO-…'` records a filed miss without failing.
- The perf project slows Chromium's CPU through the DevTools protocol, to a
  rate calibrated so every machine runs a fixed workload in the same time
  (`ROADIE_PERF_CPU` sets a fixed rate, and `1` turns it off). Chromium
  rasterises in software, as it must on GPU-less CI runners.
- `ROADIE_PERF_REPORT=<file>` appends each run as a JSON line, and
  `node testing/frames/bin/frame-table.ts Label=<file> …` turns them into a
  Markdown table.
- `commands.profileCpu('start')` and `commands.profileCpu('stop')` around a
  measurement resolve the functions that took the most main-thread time, the
  first step in finding why a run is slow.

| Engine   | rAF frame times    | Long tasks | Long animation frames | CPU throttling |
| -------- | ------------------ | ---------- | --------------------- | -------------- |
| Chromium | Sub-millisecond    | Yes        | Yes, on the top page  | Yes            |
| WebKit   | Whole milliseconds | No         | No                    | No             |
| Firefox  | Whole milliseconds | No         | No                    | No             |

WebKit and Firefox run on request (`ROADIE_PERF_BROWSERS=webkit`) with a p95
budget of 20ms, and report long-task counts as `null` rather than zero.
