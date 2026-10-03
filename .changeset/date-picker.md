---
'@oztix/roadie-components': minor
---

Add `DateField` (`@oztix/roadie-components/date-field`), `TimeField`
(`@oztix/roadie-components/time-field`) and `DatePicker`
(`@oztix/roadie-components/date-picker`), typed date and time fields built on
`Calendar` and the date phrase parser in `@oztix/roadie-core/datetime`.

`DateField` reads what people type, such as "14 mar", "next fri", "tomorrow"
or "1/12" (day first), and `TimeField` reads "7:30pm", "19:30" or "noon".
Text is committed on blur or Enter, then shown in the house style ("Fri 27 Nov
2026", "7:30pm"). Values are plain strings: an ISO date, `'HH:MM'`, or null.
Text that names nothing stays on screen, sets `aria-invalid` and makes the
value null; Escape puts back the last value. `DateField` takes `dateStyle`,
`today`, `timeZone`, `weekStart` and `disabled` matchers as on `Calendar`, and
`TimeField` takes `hourCycle` (12 or 24) and `minuteStep`, which the arrow
keys step by. Both take `size`, `emphasis`, `invalid` and `name`, and inherit
`invalid`, `required` and `disabled` from `Field`.

`DateField` and the date in `DatePicker` are comboboxes that suggest dates.
Focused while empty, they list hints at what can be typed, such as Today,
Next Fri, In 2 weeks and End of month, each with its date, and nothing is
highlighted, so Enter still submits the form. As text is typed they offer the
dates it could mean, with the first highlighted so Enter takes it; Escape
closes the list and keeps the text, and a second Escape puts back the last
date. Suggestions are read in `timeZone` and against `today`, and dates that
`disabled` refuses are left out.

`DatePicker` pairs a typed date with a calendar in a `Popover`, or below 48rem
in a bottom `Drawer` titled with the picker's label, whose days grow to fill the
width up to 48px. Opening it focuses the chosen day or today; choosing a day
closes it and returns focus to the calendar button. The button is named after
the picker's label and date, such as "Choose date, Doors (Fri 27 Nov 2026)", and
the popup "Choose date, Doors". The button is labelled by the `Field` label too,
so a test that finds the input with `getByLabelText` should use
`getByRole('combobox', { name })`, and one that finds the button by the exact
name "Choose date" should match its start.

`granularity='minute'` adds a `TimeField`, and the value becomes the instant
the date and time name in `timeZone`, with its offset, such as
`'2026-11-27T19:30:00+11:00'`, so event times are set on the venue's clock. It
also takes `disabled` matchers, `readOnly`, `captionLayout`, `startMonth`,
`endMonth`, `placeholder`, `inputRef`, `form` and a controlled `open`.

`Field.ErrorText` now also shows a control's own error, such as "Enter a date,
like 14 Mar or next Fri", when typed text names nothing. It shows even when
the `Field` isn't `invalid`, and wins over the error text's children until the
text is fixed.
