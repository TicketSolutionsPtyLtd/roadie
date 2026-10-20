---
'@oztix/roadie-core': minor
---

Update dark mode so floating surfaces, raised surfaces inside other surfaces,
fields, and neutral borders stand out more, since shadows barely show on a
dark page. Light mode is unchanged.

- Neutral `border-subtle`, `border-normal`, and `border-strong` move one step
  lighter, to neutral steps 7, 8, and 10. `border-subtler` and the other
  intents keep their steps. Anything drawn with them, such as
  `emphasis-normal` cards, table headers, separators, and chart axes, is a
  little lighter.
- A new `--intent-bg-floating` variable holds the floating fill: the raised
  fill in light mode, lifted 11% toward step 9 in dark mode.
  `emphasis-floating` uses it, and so does an `emphasis-raised` surface inside
  another raised or floating one, such as a selected tab or a search field in
  a `Pane`.
- `emphasis-field` keeps its sunken fill, with its edge at 50% of step 9 in
  dark mode instead of 22%, so the field shows on the page.
