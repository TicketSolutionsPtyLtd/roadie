---
'@oztix/roadie-components': patch
---

Sticky parts that paint the surface behind them (the `Records` header, the `RecordTable` header, and the weekdays and months in `Calendar` and `DateRangePicker`) no longer re-read it on every scroll of a scroll area around them. A scroll area writes its overflow to its own style as it scrolls, and each write had made every sticky part read computed style again; now only a change that could paint differently, such as a background or an intent, does.
