---
title: Browser tests that measure before a popup's starting style or the brand font settles
date: 2026-10-23
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    firefox,
    base-ui,
    starting-style,
    fonts,
    geometry,
    flaky
  ]
problem_type: test_failure
---

## Symptom

In Firefox, measuring tests failed by a fixed fraction, not by a pixel:

- QueryField "sizes operators as Buttons…" read a 32px Button as
  `30.399993896484375` (16 of 20 runs of the file on main), and "opens the
  list no wider than the field…" read the popup 7px (phone) or 16px
  (desktop) off the field's left edge.
- ToggleGroup "scrolls to the end Home or End moves focus to…", run alone,
  stopped at `scrollLeft` 172 of 175 in about one run in ten.

## Cause

**The popup's starting style.** Combobox's popup has
`data-[starting-style]:scale-95`. The test file turns transitions off, but
Base UI still holds `data-starting-style` for a few frames after the popup
mounts (about 55ms, 3 or 4 frames, measured in Firefox). Options are
findable during that window, so a test that measured right after
`findByRole` read every box at 95%: 32 × 0.95 = 30.4, and a 280px popup
inset by 280 × 0.05 / 2 = 7px. Run alone, the test was slow enough to miss
the window; later in the file it wasn't.

**The brand font.** The first test in a fresh page can run before
Intermission has loaded. When `End` landed, `document.fonts.status` was
still `loading`; ToggleGroup's `revealItem` scrolled `Year` into view with
the widths it had then, and the track ended 3px short. Loading the font
first ended the failures (0 of 40 runs, against 5 of 60 without).

Neither is a bug a user sees: the popup is meant to scale in, and the font
swap is a one-off at page load.

## Fix

Wait for the real condition, not a time:

- Before measuring a Base UI popup, wait for its starting style to go
  (`openedPopup()` in `QueryField.browser.test.tsx`):

  ```ts
  await expect.poll(() => popup.hasAttribute('data-starting-style')).toBe(false)
  ```

- In a file that measures text, load the brand font in `beforeAll` with
  `loadBrandFont()` from `Pane/testUtils.ts`.

## Check

```bash
ROADIE_BROWSERS=firefox pnpm test:gated components src/components/QueryField/QueryField.browser.test.tsx --project 'browser*' --retry=0
```

Repeat it: a single pass proves nothing. A height of exactly 95% of the
expected one points here.
