---
'@oztix/roadie-components': minor
---

Add `Toggle` and `ToggleGroup`. `Toggle` is a pressed or unpressed button that
takes Button's sizes and steps up one emphasis when pressed; with only an icon
inside it renders square. `ToggleGroup` is a segmented control with a pill that
slides to the pressed item. `emphasis` sets the pill: `strong` (solid,
inverted), `normal` (raised, the default) or `subtle` (tinted), each in a
tinted track like Tabs, or `subtler`, a tinted pill with no track. It is single select by default and
never ends up empty, takes `multiple` for independent toggles, and has `size`
(matching Button heights), `direction` and `disabled`.
