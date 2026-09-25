---
'@oztix/roadie-core': patch
---

Emphasis and field hover states now only apply on devices that can hover. On a
touch screen the last button tapped kept its hover colour and lift, so it looked
stuck or half disabled until something else was tapped. A tapped raised field
also keeps its rim light, and a translucent field stays see-through. Focus and
press states are unchanged.
