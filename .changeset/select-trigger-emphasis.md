---
'@oztix/roadie-components': minor
---

Select-style triggers now use a visible border instead of the raised look. `Select.Trigger`, `DateRangePicker` and `DashboardPeriod` default to `emphasis-normal`, with no shadow or rim light, and keep the field states for hover, focus, open and invalid.

Adds `emphasis='subtler'` to the same three: no fill or border at rest, as wide as its value and icon rather than its container, the hover and press of a subtler `Button`, a danger edge when invalid. `Records.Pagination` uses it for rows per page, so it sits with the subtler page buttons beside it, and keeps the width of its widest option as the page size changes.
