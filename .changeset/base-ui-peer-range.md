---
'@oztix/roadie-components': patch
---

Raise the `@base-ui/react` peer range from `^1.0.0` to `^1.6.0`. Roadie
already needed 1.6: `Drawer`, the `InputGroup` parts of `Combobox` and
`Autocomplete`, and `Select.Label` don't exist before 1.3, and `Navigator`
menus and tooltips fail their tests before 1.6. If you pin `@base-ui/react`
below 1.6, upgrade it along with this release.
