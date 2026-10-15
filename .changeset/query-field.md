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
typed text and keeps the chips, and an Escape the field uses doesn't reach
the page. When several fields ask for the same `shortcut`, the first one
mounted takes it and shows its hint. Clear also ends the value step, and with
`onClear` it hands over the text and chips in one call. The
search icon and Clear stay on the first row as chips wrap. A suggestion's
`icon` shows before its label, and the "Search for …" row has a search icon.
A `pendingChip` with two or more `operators` shows them as a toggle above the
values, with the chosen `operator` pressed: pressing one, or Tab and Shift+Tab
in the input while they show, calls `onPendingOperatorChange`, keeps focus in
the input, and asks `suggest` again. Tab from the last operator, or Shift+Tab
from the first, leaves the field.
A line divides the value step's groups, and a group with `hideLabel` names
itself for screen readers only.
