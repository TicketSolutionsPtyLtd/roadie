---
'@oztix/roadie-components': minor
---

Add `DateField` (`@oztix/roadie-components/date-field`), `TimeField`
(`@oztix/roadie-components/time-field`), and `DatePicker`
(`@oztix/roadie-components/date-picker`), typed date and time fields built on
`Calendar` and the date phrases in `@oztix/roadie-core/datetime`.

`DateField` reads what people type, such as "14 mar", "next fri", "tomorrow",
or "1/12" (day first), and suggests the dates it could mean. `TimeField` reads
"7:30pm", "19:30", or "noon". Text is committed on blur or Enter and shown in
the house style ("Fri 27 Nov 2026", "7:30pm"). Values are plain strings: an ISO
date, `'HH:MM'`, or null. Text that names nothing stays on screen, sets
`aria-invalid`, and shows its error in `Field.ErrorText`.

`DatePicker` pairs a typed date with a calendar in a `Popover`, or below 48rem
in a bottom `Drawer`. `granularity='minute'` adds a `TimeField`, and the value
becomes the instant the date and time name in `timeZone`, such as
`'2026-11-27T19:30:00+11:00'`, so event times are set on the venue's clock.

All three inherit `invalid`, `required`, and `disabled` from `Field`. The
picker's calendar button is labelled by the `Field` label too, so a test that
finds the input with `getByLabelText` should use `getByRole('combobox', { name })`.

`Field.ErrorText` now also shows a control's own error, such as "Enter a date,
like 14 Mar or next Fri", even when the `Field` isn't `invalid`.
