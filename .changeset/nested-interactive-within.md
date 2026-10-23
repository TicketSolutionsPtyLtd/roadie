---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Fix an `is-interactive-within` surface taking the hover, press and focus ring of a nested surface's target. A `Card` around a grouped `DataTable`, linked `DataTable` rows or `RecordTable` list rows now stays still when one of those rows is hovered, pressed or focused, and a subtler card keeps its tint. A target now belongs to the nearest `is-interactive-within` around it.
