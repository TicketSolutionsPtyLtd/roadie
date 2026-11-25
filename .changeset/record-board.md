---
'@oztix/roadie-components': minor
---

Add a board layout to `Records`: `boardLayout({ groupBy, title, onMove })` from `@oztix/roadie-components/record-board` shows a column for each option of the `groupBy` field, in option order, then "No <field>", saved as `{ type: 'board', groupBy: [field] }`. Cards move to another column by drag, or from the Move menu on their handle. `onMove(row, value)` gets the column's option value, or null for "No <field>", and a rejection puts the card back with its message. On a phone the columns sit in a row that scrolls sideways, each about 85% of the width, so the next column peeks in.
