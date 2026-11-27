---
title: Firefox 159 crashes when a page reads `ariaLabelledByElements` after Playwright has
date: 2026-11-17
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    firefox,
    playwright,
    axe-core,
    aria-labelledby,
    element-reflection,
    crash
  ]
problem_type: test_failure
---

## Symptom

Every test in the Firefox job passes, but Vitest reports one unhandled error
and the job exits 1:

```
Error: The firefox page crashed while running tests. This can happen if the
browser ran out of memory.
Serialized Error: { code: 'VITEST_BROWSER_CONNECTION_CLOSED' }
```

No test is marked failed. The file the crash hit is the one missing from the
list of passed files, and the test count comes up short: `1768 passed` where
the run before had 1801. It started with the bump to Playwright 1.65, whose
Firefox is 159. Memory has nothing to do with it.

Here the file was `src/checks/a11y.browser.test.tsx`, and the test was
"Accessibility on a desktop > in light mode > date-picker-open has no serious
axe violations". It crashes run alone, every time, on macOS and in CI.

## Cause

Firefox 159 crashes the page when two JavaScript worlds read
`ariaLabelledByElements` on the same element:

1. Vitest hands Playwright a selector for the element a test clicks or
   hovers, such as `role=button[name="Save"]`. Playwright 1.65 resolves it in
   its own isolated world, and to match a name its script reads
   `ariaLabelledByElements` on every candidate, not only on the element the
   test acts on.
2. axe-core 4.14 reads the same property from the page to resolve
   `aria-labelledby` (its `button-name` rule, in the `aria-labelledby` check).

The second read crashes. The DatePicker's calendar button is labelled with
`aria-labelledby`, the scenario opens it with `userEvent.click`, and at
desktop width the popover leaves the button exposed, so axe names it. On a
phone the picker opens in a modal drawer, which hides the button from axe, so
those tests pass.

It takes nothing from Roadie to reproduce:

```ts
document.body.innerHTML =
  '<span id="label">Label</span><button aria-labelledby="label">b</button>'
const button = document.querySelector('button')!
await userEvent.hover(button) // Playwright reads the property in its world
button.ariaLabelledByElements // the page reads it, and crashes
```

The element read doesn't have to be the one the test acted on. Hovering a
second button, then reading the property on the first, crashes the same way.
Vitest's selector for the second is its role and name, so Playwright names
every button to find it.

What it isn't, each checked in Firefox 159:

- Reading the property with no Playwright action first is fine, as is
  reading it after hovering a link or a `div`. Playwright finds those without
  naming a button.
- An in-page locator (`page.getByRole(...)` with `expect.element`) is fine.
  Vitest resolves those in the page, without the property.
- `ariaControlsElements` and `ariaDescribedByElements` are fine. Playwright
  reads only `ariaLabelledByElements`.
- Setting `aria-labelledby` again to the same value, or reading it on a clone
  of the element, is fine. The state that crashes belongs to the element and
  is dropped when the attribute is set.

## Fix

Stop the page-side read. In Firefox, the checks tell axe to resolve
`aria-labelledby` from the attribute rather than the reflected property, in
`packages/components/src/checks/testUtils.tsx`:

```ts
const labelledByFromAttribute = { type: 'idrefs' as const, prop: undefined }

if (server.browser === 'firefox') {
  axe.configure({
    standards: { ariaAttrs: { 'aria-labelledby': labelledByFromAttribute } }
  })
}
```

`prop` is the name of the reflected property in axe's table of ARIA
attributes. Without it axe looks the ids up with `getElementById`, which gives
the same elements for a label set as an attribute. A label set only through
the property, with no attribute, would go unseen in Firefox; Roadie sets none.
The other engines keep axe's default.

Copy the override into any other axe run that crashes this way. That takes a
test that clicks or hovers an element, then runs axe while that element, or
another with its role, is labelled with `aria-labelledby`. No other axe run
needs it yet, the charts and blocks checks included.

Remove it once a Playwright release ships a Firefox where the snippet above
no longer crashes.

## Finding the test behind a page crash

Vitest prints the crash with no file or test. To find it:

1. Compare the passed files and the test total with the last green run. The
   missing file is the one that crashed.
2. Run that file with `--reporter=verbose`. The crashed test is the one after
   the last test printed, though the reporter can lag by one.
3. Split the test into steps and log before each one, waiting about 100ms
   after the log so it reaches the terminal before the page dies.
