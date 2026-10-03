---
'@oztix/roadie-components': patch
---

`Autocomplete` and `Combobox` options can be chosen with a tap on an iPhone.
Base UI cancels an option's `pointerdown` to keep the input focused, and WebKit
then drops the tap's click, so a tapped suggestion closed the list without
choosing. Touch and pen now choose an option on lifting, when the finger lifts on
the option it went down on without moving off it, and the list stays open
while the finger is down, even if the input blurs as the keyboard goes. The
mouse events and click that follow the tap don't choose again, or land on
whatever the choice put under the finger, such as the page below a list that
moved on to a field's values; a drag or a scroll chooses nothing. This also fixes date suggestions in `DateField`, `DatePicker` and
`DateRangePicker`.

The date suggestions' Enter hint now shows only for a highlight made by typing
or the keys. iOS reads a row that grows content under the finger as a hover
and drops the tap's click, so a tap on a suggestion's empty right side, where
the hint appeared, didn't choose it.
