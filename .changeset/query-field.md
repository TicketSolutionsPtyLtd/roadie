---
'@oztix/roadie-components': minor
---

Add `QueryField` at `@oztix/roadie-components/query-field`: a search field
that turns what you type into filter chips. It takes your chips and a
`suggest` function, lists suggestions in the groups you return with a
"Search for …" row last, and hands what was taken to `onAccept`. Enter searches
the text unless a suggestion is marked `exact`; filters are taken by arrow or
click. Locked chips come first with a "Set by this page" tooltip and nothing in
the field removes them. Backspace on an empty field selects the last chip, then
removes it. `pendingChip` shows the field being given a value, `onEditChip`
makes chips open your editor, and `shortcut` focuses the field from anywhere on
the page. It works alone with `aria-label` or inside `Field`.
