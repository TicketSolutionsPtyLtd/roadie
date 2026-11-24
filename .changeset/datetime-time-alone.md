---
'@oztix/roadie-components': minor
---

Update `DateTime` to render the time alone when it has a `timeStyle` and no `dateStyle`, for a time under a day heading. A range with `to` shows each end as a time in its own `time` element, and `dateTime` still carries the full instant. Before, a lone `timeStyle` also drew a long date, so add `dateStyle='long'` to keep it. `stacked`, `sameNight` and `relative` keep the date they say.
