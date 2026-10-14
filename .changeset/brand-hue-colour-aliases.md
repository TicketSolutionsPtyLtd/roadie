---
'@oztix/roadie-core': minor
---

Add colour variables that name the brand scales by hue, to match the brand intents. Each one is a `var()` of the scale it names, so it follows dark mode with that scale. There are no new utility classes.

- `--color-brand-blue-0` to `--color-brand-blue-13` are `--color-brand-0` to `--color-brand-13`.
- `--color-brand-purple-0` to `--color-brand-purple-13` are `--color-info-0` to `--color-info-13`.
- `--color-brand-orange-0` to `--color-brand-orange-13` are `--color-brand-secondary-0` to `--color-brand-secondary-13`.
- `--color-brand-blue-light-{5|9|12|13}`, `--color-brand-purple-light-{5|9|12|13}`, and `--color-brand-orange-light-{5|9|12|13}` are the fixed light steps of the same scales, which keep their light colour in dark mode.
