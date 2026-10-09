---
'@oztix/roadie-core': patch
---

`text-subtle` now meets APCA Lc 75 for body text on every intent, in light and
dark mode, on the neutral surfaces and on the intent's own, including its subtle
fill. For accent this holds at the default accent hue.

- **Light mode:** step 11 is darker on brand and accent (oklch L 0.547 to
  0.431), brand-secondary (0.569 to 0.463), danger (0.569 to 0.445), success
  (0.508 to 0.44), warning (0.576 to 0.465) and info (0.505 to 0.457).
- **Dark mode:** step 11 is lighter on every intent but neutral, and step 12
  is lighter on brand, brand-secondary, accent, danger, success and info (L 0.90
  to 0.91, now 0.95, the same as neutral). That changes `text-normal` in those
  intents in dark mode, so subtle text can reach Lc 75 and still read a step
  quieter than normal text. Step 13 rises on brand, brand-secondary, accent,
  danger and info (L 0.96 to 0.99, 0.993 on brand and accent), so `text-strong`
  stays distinct from the lighter `text-normal`.

Everything else on those steps moves with them: `--intent-11`, `--intent-12` and
`--intent-13`, `bg-inverted` and `border-inverted` in dark mode, the light
strong fill's hover on brand, accent, danger and info, the dark strong fill's
hover and pressed states on browsers without `color-mix`, and the light chart
status colours for good, warning and serious. `--chart-status-critical` no
longer follows danger step 11 in light mode; it keeps its value.
