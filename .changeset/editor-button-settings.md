---
'@oztix/roadie-editor': minor
---

An email button has settings: in its toolbar, Button settings edits its link, its emphasis (strong, normal or subtle), its width (its label's or its column's), and its alignment (left, centre or right). Each change applies as it's made; closing keeps them as one undo step, and Escape puts the button back. The editor and `renderEmail` both draw them: a strong button in the accent, and a normal or subtle one in neutrals. The button saves only what isn't the default, as `align`, `emphasis: 'normal' | 'subtle'` and `fullWidth: true`. The toolbar's Edit link is now Button settings.

The email theme takes an `accent`, Oztix blue by default, which links and strong buttons use unless `link` or `button` is set, plus `border` and `tint` for normal and subtle buttons.
