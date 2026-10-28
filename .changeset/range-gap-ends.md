---
'@oztix/roadie-core': patch
---

`resolveDateRange` now reads a range end with no offset that daylight saving skips as the moment the clocks jump, as records filters do. Before, it moved the end on by the size of the jump. A range from 2:30am on the morning Sydney's clocks go forward now starts at 3am, so it no longer misses the half hour after the jump. A range from 2:59am to 3am no longer throws a `RangeError`. `resolveComparison` reads a previous-year start or end that lands in the gap the same way, so a year-earlier window no longer starts late.
