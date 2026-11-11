---
'@oztix/roadie-editor': minor
---

An email button has settings: in its toolbar, Button settings edits its link, its emphasis (strong, normal or subtle), its width (Fit, its label's, or Full width, its column's), and its alignment (left, centre or right). It opens under the button rather than over it, or on a phone as a half-height sheet over an unblurred page with the button scrolled above it, with focus on Emphasis, or on Link while the button has no link yet. Each change applies as it's made; closing, Escape included, keeps them as one undo step, and Undo puts the button back. The editor and `renderEmail` both draw them: a strong button in the accent, and a normal or subtle one in neutrals. The button saves only what isn't the default, as `align`, `emphasis: 'normal' | 'subtle'` and `fullWidth: true`.

The email theme takes an `accent`, Oztix blue by default, which links and strong buttons use unless `link` or `button` is set, plus `border` and `tint` for normal and subtle buttons.
