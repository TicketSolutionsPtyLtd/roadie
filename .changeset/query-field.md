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
gives chips an edit button that opens your editor, `shortcut` focuses the field
from anywhere on the page, and `inputRef` reaches the input. It works alone with
`aria-label` or inside `Field`; `required` is announced but never blocks a form.
A suggestion's `remainder` stays in the field once it is taken, so "melb this
weekend" can take Melbourne and keep "this weekend" for the next suggestion. A
chip's `description`, such as the dates "This weekend" stands for, shows in a
tooltip and is read after its label. Escape with the list closed clears the
typed text and keeps the chips. The search icon and Clear stay on the first
row as chips wrap.
