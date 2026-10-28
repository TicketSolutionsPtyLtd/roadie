---
'@oztix/roadie-components': minor
---

Add `stacked` to `DateTime`, which puts the time on a line under the date for a dense table column. It's still one `time` element, and its `dateTime` carries the full instant, so a screen reader hears `27 Nov 2026, 7:30pm`. It needs a `timeStyle`. Without one, or with `relative`, it renders on one line as before. A range on one day, or one night with `sameNight`, says the date once over the two times. A range across days stays on one line.
