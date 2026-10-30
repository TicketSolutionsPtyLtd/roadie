---
'@oztix/roadie-components': patch
---

Fix a `RecordTable` row checkbox ignoring a click on the padding around its box, or a press that slipped off the box as the page moved. The toggle now runs from the checkbox's change, so the whole label selects the row, with Shift still extending a range.
