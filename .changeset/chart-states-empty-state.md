---
'@oztix/roadie-components': minor
'@oztix/roadie-charts': patch
---

Update `DataCard`'s empty and error states to use `EmptyState`, like the rest of Roadie: an icon tile above the message at every size but `stat`, the error in danger with `errorAction` under its message. The state takes the body's place, at least `bodyHeight` tall, so a card keeps its loading height and an empty stat tile doesn't stretch its row. A chart that can't be drawn now says "This chart couldn't be drawn" in its card, the same message and look it shows before hydration, so a server-rendered dashboard no longer flashes from one error to another. An app's own `state` of loading, empty or error still wins over an earlier draw failure.
