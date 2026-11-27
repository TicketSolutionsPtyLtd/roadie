---
'@oztix/roadie-core': minor
---

Deprecate `--focus-ring-opacity-dark`. Every focus ring now reads `--focus-ring-opacity`, which dark mode sets too, at 30% in both modes. Dark rings on fields, field groups, plain links and buttons, `is-focusable`, `is-focusable-overlay`, and `is-interactive-within` go from 20% to 30%, matching Checkbox, Radio, Switch, and Slider, which were already at 30%. `--focus-ring-opacity-dark` stays as an alias of `--focus-ring-opacity` until the next major, but setting it no longer changes a ring; set `--focus-ring-opacity` inside `.dark` instead.
