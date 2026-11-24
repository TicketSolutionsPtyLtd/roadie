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
  `knownMiss: 'INNO-…'` records a filed miss without failing, until it's fixed.
  `exception: '…'` records a miss accepted by design, naming why, so the table
  shows it and CI doesn't fail. Today that's the full-page backdrop blur
  behind Dialog and Drawer, which costs more than a frame to draw in
  software raster, and long lists drawn without virtualisation: a Select past
  its ~15-item guideline, and a Combobox of thousands without `virtualized`.
- An excused run doesn't fail, so the file prints a line for each one when
  its tests end, met or missed. `note: '…'` keeps a short remark with a run,
  such as its style time: the run prints the same way, and the table gains a
  Note column.

  ```text
  FRAMES Dialog, open: p95 33.3ms, 8.3% dropped. Missed (p95 33.3ms is over 17.5ms), accepted: the full-page backdrop blur, kept by design (INNO-1522)
  ```

- The perf project slows Chromium's main thread through the DevTools
  protocol, to a rate calibrated so every machine runs a fixed workload in
  the same time (`ROADIE_PERF_CPU` sets a fixed rate, and `1` turns it off).
  Chromium rasterises in software, as it must on GPU-less CI runners. A run
  that mixes engines in `ROADIE_PERF_BROWSERS` leaves that off, since the
  flag would go to every engine.
- `ROADIE_PERF_REPORT=<file>` appends each run as a JSON line, and
  `node testing/frames/bin/frame-table.ts Label=<file> …` turns them into a
  Markdown table.
- `commands.profileCpu('start')` and `commands.profileCpu('stop')` around a
  measurement resolve the functions that took the most main-thread time, the
  first step in finding why a run is slow.

## What the numbers mean

A frame time is the gap between two `requestAnimationFrame` callbacks, so it
counts anything that holds the next frame back. The throttle slows only some
of that work.

| Work                                           | Runs on                    | Throttled |
| ---------------------------------------------- | -------------------------- | --------- |
| React, style, layout, and paint recording      | The renderer's main thread | Yes       |
| Raster, filters, blurs, masks, and compositing | Other threads, in software | No        |

- The throttle is `Emulation.setCPUThrottlingRate` (`src/config.ts`). It
  slows the main thread and leaves drawing at the machine's own speed.
- A miss that comes from drawing alone, such as a chain of filters on a card
  that moves, is a miss at the machine's full speed.
- Drawing is in software (`--disable-gpu`), with no GPU to keep a promoted
  layer as a texture. A fix that promotes a layer, such as
  `will-change: transform`, shows no gain here: a carousel of ticket cards
  dropped about three frames in four with it and without.
- A pass says nothing about a GPU, WebKit, Firefox, or a real phone. CI runs
  Chromium only. Before a release that changes a filter, blur, or mask, run
  WebKit and try the change on a real phone.

## Engines

| Engine   | rAF frame times    | Long tasks | Long animation frames | CPU throttling |
| -------- | ------------------ | ---------- | --------------------- | -------------- |
| Chromium | Sub-millisecond    | Yes        | Yes, on the top page  | Yes            |
| WebKit   | Whole milliseconds | No         | No                    | No             |
| Firefox  | Whole milliseconds | No         | No                    | No             |

WebKit and Firefox run on request (`ROADIE_PERF_BROWSERS=webkit`) with a p95
budget of 20ms and 10% of frames dropped, and report long-task counts as
`null` rather than zero.
