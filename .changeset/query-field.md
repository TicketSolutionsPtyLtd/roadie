---
'@oztix/roadie-components': minor
---

Add `QueryField` (`@oztix/roadie-components/query-field`), a search field that turns what you type into filter chips.

It takes your chips and a `suggest` function, lists suggestions in the groups you return with a "Search for …" row, and hands what was taken to `onAccept`. Enter searches the typed text unless a suggestion is marked `exact`, and filters are taken by arrow or click. A suggestion's `remainder` stays in the field once it's taken, so "melb this weekend" can take Melbourne and keep "this weekend" for the next one.

A `pendingChip` runs a value step: picking a field, such as Venue, shows its values, under a toggle of `operators` when it has more than one, with an optional `hint` and `content`, such as a calendar. `onSelectChip` and `pendingChip.chipId` edit an existing chip in the list. `locked` chips, such as the page's scope, come first and nothing in the field removes them. Backspace in an empty field selects the last chip, then removes it, and `focusShortcut` focuses the field from anywhere on the page. It works alone with `aria-label` or inside `Field`.
