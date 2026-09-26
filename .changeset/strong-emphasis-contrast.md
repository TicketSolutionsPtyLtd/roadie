---
'@oztix/roadie-core': minor
---

Text on a strong colour fill now reaches APCA Lc 60 in both modes, at rest, on
hover and when pressed. Each intent takes the text polarity that reads better on
its fill:

- White on brand, accent, info and danger, now in dark mode too, where these
  intents used near-black text. Danger's strong fill moves one step deeper, to
  step 10. In dark mode, hover and press darken the fill to steps 8 and 7.
- Dark text on success, warning and brand-secondary: step 13 in light mode, step
  0 in dark mode. Success and brand-secondary lift their fill 10% toward white.
  Hover and press lighten the fill further in both modes.

A custom accent keeps its white text too. The new `getAccentChromaSync(hex)`
caps an accent's chroma to what sRGB can show at step 9, because browsers clip
a more saturated fill and the clip makes it lighter. `getBootstrapScript` now
uses it, so a saturated green or cyan accent no longer renders too light.

Hover and press use the new `--intent-bg-strong-hover` and
`--intent-bg-strong-active` tokens. Neutral is unchanged. `emphasis-inverted`
and the overlays now take their text from step 0, so they look the same as
before.

This is a minor bump because `text-inverted` and some strong fills change
colour. If you paired `text-inverted` with a fill other than `bg-strong`, check
it still reads.
