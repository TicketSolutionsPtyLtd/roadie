---
'@oztix/roadie-core': minor
---

Update dark mode so raised and floating surfaces, fields, and neutral borders
stand out more, since shadows barely show on a dark page. Light mode is
unchanged.

- Neutral `bg-raised` and `emphasis-raised` move from step 3 to step 4.
- A new `--intent-bg-floating` variable holds the floating fill: the raised
  fill in light mode, lifted 20% toward step 9 in dark mode.
  `emphasis-floating` uses it, and so does an `emphasis-raised` surface inside
  another raised one, such as a selected tab or a search field in a `Pane`.
  A raised surface inside a floating one lifts 20% again.
- On dark raised and floating surfaces, `text-subtle` moves 40% toward step 12,
  so it keeps APCA Lc 75 on the lighter fills.
- An `emphasis-subtle` track with an `emphasis-raised` pill in it, such as the
  `Tabs` list at its default emphasis, takes the sunken fill in dark mode, so
  the chosen tab stands out from its track.
- Neutral `border-subtle`, `border-normal`, and `border-strong` move one step
  lighter, to neutral steps 7, 8, and 10. `border-subtler` and the other
  intents keep their steps. Anything drawn with them, such as
  `emphasis-normal` cards, table headers, separators, and chart axes, is a
  little lighter.
- `emphasis-field` keeps its sunken fill, with its edge at 50% of step 9 in
  dark mode instead of 22%, so the field shows on the page.
