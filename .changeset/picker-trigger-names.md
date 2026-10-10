---
'@oztix/roadie-components': patch
---

Rename the triggers of `DatePicker`, `DateRangePicker`, and `DashboardPeriod`
so their accessible name holds the value as the button shows it, which
WCAG 2.5.3 (label in name) and axe-core 4.14 ask for. The value now comes
after the action and before the picker's label, with no parentheses, and its
parts are joined by spaces as on screen. The popup's name doesn't change.

- Before: "Choose dates, Period (This month, 1 to 31 Oct 2026, vs 1 to 30 Sept 2026)"
- After: "Choose dates, This month 1 to 31 Oct 2026 vs 1 to 30 Sept 2026, Period"
- Before: "Choose date, Doors (Fri 27 Nov 2026)"
- After: "Choose date, Fri 27 Nov 2026, Doors"

A test that finds a trigger by a name starting "Choose dates, Period" should
match the label at the end instead, such as `{ name: /, Period$/ }`.
