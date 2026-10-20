---
title: Firefox's Tab skips controls that a blur handler shows
date: 2026-10-20
category: component-patterns
module: components
tags: [firefox, focus, keyboard, tab-order, flushSync, records, toolbar]
problem_type: browser_api_edge_case
---

## Symptom

In a narrow `Records.Toolbar`, the focused search takes the whole row and
the other controls hide until focus leaves it. Tab from the search should
land on the next control. In Firefox it skipped them and left the toolbar.

## Cause

The controls came back on a state change that React committed after the
`keydown`. Firefox picks Tab's target during the keydown's default action,
from styles it has already computed, so the controls were still
`display: none` when it looked.

## Fix

In the `Tab` keydown, commit the state and force a style recalculation
before the default action runs (roadie#557, `Records/RecordsSearch.tsx`):

```tsx
flushSync(() => onFocusChange(false))
void event.currentTarget.parentElement?.offsetWidth
```

`flushSync` puts the controls in the DOM; the layout read makes Firefox
restyle them before it chooses the target.

## Check

"shows the other controls again as Tab leaves the search" in
`Records/RecordsHeader.browser.test.tsx`, run in Firefox
(`ROADIE_BROWSERS=firefox`). The bug is Firefox's, so only a Firefox run
proves the fix.
