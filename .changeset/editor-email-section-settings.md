---
'@oztix/roadie-editor': minor
---

Add Section settings to the `email` preset: a Look of Plain, Tint, or Accent from the `EmailTheme`, Spacing of Tight, Normal, or Roomy, and Show to, which edits the section's `showWhen` with a merge tag, a comparison, and a value. A section saves `look: 'tint' | 'accent'` and `spacing: 'tight' | 'roomy'` only when they aren't the default, `migrate` drops any other value, and `renderEmail` fills and pads the section to match. A section with a rule shows a badge that reads it, such as "Only when Tickets left < 50".
