---
'@oztix/roadie-components': minor
---

Add `Toggle` and `ToggleGroup`. `Toggle` is a pressed or unpressed button that
takes Button's sizes and steps up one emphasis when pressed; with only an icon
inside it renders square. `ToggleGroup` is a segmented control with a pill that
slides to the pressed item. `emphasis` follows Toggle: `normal` (the
default) has a raised track and `subtle` a tinted one, each with a solid pill,
and `subtler` has no track and a tinted pill. It is single select by default and
never ends up empty, takes `multiple` for independent toggles, and has `size`
(matching Button heights), `direction` and `disabled`.
