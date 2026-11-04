---
'@oztix/roadie-components': patch
---

Sticky headers in `RecordTable` and the month list in `Calendar` and `DateRangePicker` no longer re-read their surface colour on every scroll of a scroll area around them. A scroll area writes its overflow to its own style as it scrolls, and each write had made every sticky part read computed style again; now only a change that could paint differently, such as a background or an intent, does.
