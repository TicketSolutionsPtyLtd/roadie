---
'@oztix/roadie-core': patch
---

Emphasis hover, focus and press tints show in apps whose bundler lowers CSS nesting, such as Next. A subtler `Button` or a linked card lost its hover tint there, because the merged selector made its resting fill outrank its hover. A surface with a `data-interactive-target` link now weighs the same as an `is-interactive` one, so a linked row inside a subtle or normal list shows the list's fill at rest, as a clickable row does.
