---
'@oztix/roadie-core': minor
---

Text on a strong colour fill now reaches APCA Lc 60 in both modes, at rest, on
hover and when pressed, in browsers that support `color-mix()`. Each intent takes the text polarity that reads better on
its fill:

- White on brand, accent, info and danger, now in dark mode too, where these
  intents used near-black text. Danger's strong fill moves one step deeper, to
  step 10. In dark mode, hover and press darken the fill to steps 8 and 7.
- Dark text on success, warning and brand-secondary: step 13 in light mode, step
  0 in dark mode. Success and brand-secondary lift their fill 10% toward white.
  Hover and press lighten the fill further in both modes.

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
`text-inverted`: `white` for Oztix blue, where it used to say `black`. It also
no longer lifts a grey accent to chroma 0.1, so the hex fallback matches the
CSS.

White labels on brand, accent, info and danger are 3.2 to 3.5:1 by WCAG 2. That
meets 3:1, not the 4.5:1 WCAG 2 asks of normal-size text. The accessibility
page now names strong-fill labels as the APCA exception.

Hover and press use the new `--intent-bg-strong-hover` and
`--intent-bg-strong-active` tokens. Neutral is unchanged. `emphasis-inverted`
and the overlays now take their text from step 0, so they look the same as
before.

This is a minor bump because `text-inverted` and some strong fills change
colour. If you paired `text-inverted` with a fill other than `bg-strong`, check
it still reads.
