---
'@oztix/roadie-components': minor
---

`CommandPalette` shows results the app searched for itself: `filter={null}` keeps `items` in the app's order, `onQueryChange` reports the search, and `status` (`'idle'`, `'loading'` or `'error'`) shows the new `CommandPalette.Status` spinner or the `CommandPalette.Error` danger empty state with retry `actions`, hiding `CommandPalette.Empty` in both. `CommandPalette.Page` takes its own `filter={null}`.
