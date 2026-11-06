---
'@oztix/roadie-editor': minor
---

Add Section settings to the `email` preset: a Look of Plain, Tint, or Accent from the `EmailTheme`, Spacing of Tight, Normal, or Roomy, and Show to, which edits the section's `showWhen` with a merge tag, a comparison, and a value. A section saves `look: 'tint' | 'accent'` and `spacing: 'tight' | 'roomy'` only when they aren't the default, `migrate` drops any other value, and `renderEmail` fills and pads the section to match. Each section has a small toolbar on its top edge with Settings, shown while it holds the caret or is hovered, and a badge reading its rule, such as "Only when Tickets left < 50", or a warning when the rule names a merge tag `variables` doesn't list. A section with a rule keeps a faint outline.

The section toolbar draws on its own floating surface, so it reads on a light or dark canvas, and its Settings shows only once the editor has focus.
