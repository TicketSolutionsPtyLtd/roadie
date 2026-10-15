---
'@oztix/roadie-components': minor
---

Add `QueryField` at `@oztix/roadie-components/query-field`: a search field
that turns what you type into filter chips. It takes your chips and a
`suggest` function, lists suggestions in the groups you return with a
"Search for …" row last, and hands what was taken to `onAccept`. Outside a
value step, Enter searches the text unless a suggestion is marked `exact`,
and filters are taken by arrow or click. Locked chips come first with a "Set
by this page" tooltip, and nothing in the field removes them. Backspace on an
empty field selects the last chip, then removes it. `pendingChip` shows the
field being given a value, `onSelectChip` hears a click, Enter, or Space on a
chip, `shortcut` focuses the field from anywhere on the page, and `inputRef`
reaches the input. It works alone with `aria-label` or inside `Field`.
`required` is announced but never blocks a form.

A suggestion's `remainder` stays in the field once it is taken, with the list
open, so "melb this weekend" can take Melbourne and keep "this weekend" for
the next suggestion. A chip's `description`, such as the dates "This weekend"
stands for, shows in a tooltip and is read after its label. Escape with the
list closed clears the typed text and keeps the chips, and an Escape the field
uses doesn't reach the page. When several fields ask for the same `shortcut`,
the first one mounted takes it and shows its hint. Clear also ends the value
step, and with `onClear` it hands over the text and chips in one call. The
search icon and Clear stay on the first row as chips wrap. Clear is round, as
a chip's remove button is, focus ring included. A suggestion's `icon` shows
before its label, and the "Search for …" row has a search icon. With nothing
to suggest, no hint, no operators, and no text, the list stays closed rather
than say No suggestions.

A `pendingChip` with two or more `operators` shows them as a toggle above the
values, with `operator` pressed. Pressing one, or Tab and Shift+Tab in the
input while they show, calls `onPendingOperatorChange`, keeps focus in the
input, and asks `suggest` again. Tab from the last operator, or Shift+Tab from
the first, leaves the input and ends the step, as any Tab out of a step does. In the value step, Enter takes the first value
once text is typed. Mark a step's one answer `exact`, such as "City is empty",
and Enter takes it before anything is typed. Mark one that opens an editor
`opensEditor`, such as "Custom dates", and only an arrow or a click takes it.
`pendingChip.hint`, such as "Type a number.", shows and is announced in place
of No suggestions while no value is listed, and below the values while Enter
has none to take for the typed text. Focus moving to something outside the
field and its list, or a press outside them, calls `onPendingChipCancel`, as
Escape does. Focus going nowhere, as when a phone's keyboard is put away,
keeps the step.

To edit a chip in the list, answer `onSelectChip` with a value step whose
`pendingChip.chipId` names the chip. The chip shows selected in place of a
pending chip, focus stays in the input, and taking a value keeps the list
open. Ending the step in `onAccept`, as for a chip that holds one value,
closes it. A suggestion marked `selected` is ticked, and Enter on typed text passes
over it. Backspace in the empty field removes the edited chip. Escape, or
focus leaving the field, ends the step and keeps the chip.
