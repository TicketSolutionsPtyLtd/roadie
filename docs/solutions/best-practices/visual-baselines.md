---
title: Visual baselines and axe checks for the browser tests
date: 2026-10-09
category: best-practices
module: components
tags: [vitest, browser-mode, playwright, screenshots, axe, accessibility]
problem_type: best_practice
---

## Problem

Most UI defects in early October 2026 (layout, flicker, and wrong states on a
phone) were found by hand. Screenshots and axe catch that class of regression
for free, but a screenshot only means something against a baseline rendered
on the same machine image, so baselines need one source and a review.

## Solution

`packages/components/src/checks/` holds the scenarios in `testUtils.tsx`
(Calendar, DatePicker, DashboardPeriod, and Autocomplete, open and closed)
and two files that run each one at 390px and 1280px, in light and dark.

- `a11y.browser.test.tsx` runs axe in every engine and fails on any serious
  or critical violation that isn't in `knownViolations`. Each entry there
  names a Jira ticket and leaves when the ticket is fixed.
- `visual.browser.test.tsx` compares each scenario with its baseline in
  `__screenshots__/`, through Vitest's `toMatchScreenshot`. It is the
  `browser visual` project, which runs in Chromium only, and only in CI or
  with `ROADIE_VISUAL=1`, so it costs one engine and skips on a Mac.

To cover a new state or component, add a scenario. Both checks pick it up.

## Updating a baseline

Baselines are rendered only in CI's Playwright image
(`mcr.microsoft.com/playwright:v<root playwright version>-noble`, on amd64),
never on a Mac, whose fonts and antialiasing differ. `.gitignore` drops
`-darwin` and `-win32` renders.

1. Start Docker, then run
   `pnpm --filter @oztix/roadie-components test:visual:update`. It copies the
   working tree into the image, installs, and runs the visual project with
   `--update`, then copies new and changed `-chromium-linux.png` files back.
   Pass `-t '<scenario>'` to update some of them.
2. Look at every changed PNG in the diff, and delete the baseline of a
   scenario you removed.
3. Commit the PNGs with the change that caused them, and say in the PR's
   Evidence which images changed and why. The reviewer approves the images
   along with the code.

When CI fails, the job prints the `-actual` and `-diff` paths under
`.vitest/attachments/`. A missing baseline also fails CI, so a new scenario
lands with its baseline.
