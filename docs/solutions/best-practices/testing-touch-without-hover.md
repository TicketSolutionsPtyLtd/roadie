---
title: Testing touch styles in browser tests when Playwright can't turn hover off
date: 2026-09-27
category: best-practices
module: components
tags: [vitest, browser-mode, playwright, touch, hover, media-query]
problem_type: best_practice
---

## Problem

Roadie applies hover fills only under `@media (hover: hover)` (#192), so a tap
on a touch screen doesn't leave a control filled. Playwright can emulate
reduced motion and forced colours, but not `hover: none`, so a browser test
can't ask for a device without hover.

## Solution

Call `setHoverCapable(false)` from
`packages/components/src/css/testUtils.ts` after the stylesheets are in the
document. It finds every `(hover: hover)` and `not (hover: hover)` media rule
through the CSSOM and pins each to match or not, as a touch screen would.
`setHoverCapable(true)` puts them back.

```ts
import { setHoverCapable } from '../../css/testUtils'

beforeEach(() => setHoverCapable(false))
afterEach(() => setHoverCapable(true))
```

The pointer also stays wherever the last test file on the page left it, which
can hover something in the next file. Tests that need nothing hovered call
the `parkPointer` browser command first (#198), which moves the pointer to the
top-left corner:

```ts
import { commands } from 'vitest/browser'

beforeEach(() => commands.parkPointer())
```

`touchHover.browser.test.ts`, Menu (#180) and Select, Combobox and
Autocomplete (#196) use `setHoverCapable`. Toast uses `parkPointer`, after a
pointer left over a top viewport fanned out its stack.
