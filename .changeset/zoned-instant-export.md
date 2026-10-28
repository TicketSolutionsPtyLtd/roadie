---
'@oztix/roadie-core': minor
---

Add `zonedInstant` to `@oztix/roadie-core/datetime`. It turns a venue's wall-clock time and its zone into a `Date`, which every formatter and `<DateTime>` take as it is: `zonedInstant('2026-11-28T19:30', 'Australia/Brisbane')`. It takes `YYYY-MM-DDTHH:mm`, with seconds optional. Any other string, including one with an offset or `Z`, throws a `RangeError`. A time daylight saving skips moves on by the size of the jump, and a repeated time takes the first.
