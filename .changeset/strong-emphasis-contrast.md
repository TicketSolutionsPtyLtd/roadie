---
'@oztix/roadie-core': minor
---

Add `text-on-strong` (`--intent-text-on-strong`), the label colour for strong
fills. Each intent takes whichever text colour reads better on its fill, and
reaches APCA Lc 60 in both modes, at rest, on hover and when pressed, in
browsers that support `color-mix()`. `emphasis-strong`, CalendarTile's strong
band, and the strong Tabs and ToggleGroup pills use it.

- White on brand, accent, info and danger, in both modes. Danger's strong fill
  moves one step deeper, to step 10. In dark mode, hover and press darken the
  fill to steps 8 and 7.
- Dark text on success, warning and brand-secondary: step 13 in light mode, step
  0 in dark mode. Success and brand-secondary lift their fill 10% toward white.
  Hover and press lighten the fill further in both modes.

`text-inverted` is unchanged: it's still the page's text colour flipped, and
pairs with `bg-inverted`. To migrate, use `text-on-strong` for labels on
`bg-strong` or `emphasis-strong` fills where you used `text-inverted`.

A custom accent keeps its white text too. The new `getAccentChromaSync(hex)`
caps an accent's chroma to what sRGB can show at step 9, because browsers clip
a more saturated fill and the clip makes it lighter. `getBootstrapScript` and
`generateAccentScale`, which writes the hex fallback scale, now use it, so a
saturated green or cyan accent no longer renders too light.

Browsers that draw `oklch()` but not `color-mix()` (Safari 15.4 to 16.1) get
step 9 for the lifted strong fills and steps 7 and 6 for hover and press, so
the fills stay solid there. Success and brand-secondary read at about Lc 57 to
58 at rest in those browsers.

`generateAccentScale` now reports `fgOnStrong` by APCA, so it matches
`text-on-strong`: `white` for Oztix blue, where it used to say `black`. It also
no longer lifts a grey accent to chroma 0.1, so the hex fallback matches the
CSS.

White labels on brand, accent, info and danger are 3.2 to 3.5:1 by WCAG 2. That
meets 3:1, not the 4.5:1 WCAG 2 asks of normal-size text. The accessibility
page now names strong-fill labels as the APCA exception.

Hover and press use the new `--intent-bg-strong-hover` and
`--intent-bg-strong-active` tokens. Neutral is unchanged.

This is a minor bump because it adds a utility and tokens, and some strong fills
and their label colours change.
