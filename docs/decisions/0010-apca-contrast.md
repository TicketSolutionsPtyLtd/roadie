# 0010 Contrast is measured with APCA

## Context

Roadie's palette was tuned with APCA, but the brand guidelines and axe's
`color-contrast` rule use WCAG 2 ratios. The two disagree most on saturated
mid-tones: white on the accent strong fill fails WCAG 2 at 3.36:1 but passes
APCA at Lc 65.7 (INNO-1182). Two measures would give two answers for the
same pair.

## Decision

Roadie measures all contrast with APCA, including body text. The minimums:

| Role                                   | Minimum |
| -------------------------------------- | ------- |
| Body text                              | Lc 75   |
| Labels on strong fills, and large text | Lc 60   |
| Non-text UI, and large display text    | Lc 45   |

APCA models perceived lightness contrast better than WCAG 2's ratio, which
overstates contrast on dark backgrounds and understates it on saturated
fills. One measure keeps the palette, the docs, and the checks in agreement.

## Consequences

The accessibility check turns off axe's `color-contrast` rule and reads
computed colours in the browser to assert these minimums by role. Pairs that
already shipped under their minimum are allow-listed with a ticket. The brand
Colour page states APCA only.

One pair is excepted for good: the accent strong fill of a chosen day in
Calendar measures Lc 38.9 against the dark popover and 40.1 against the dark
page. Its white semibold label carries the selected state. No colour in the
sRGB gamut reaches Lc 45 against those surfaces while keeping a white label at
Lc 60; the closest is about 44.8 and 59.8 (INNO-1198).

Dark chart marks and greys are non-text UI, so the dataviz validator measures
them with APCA at Lc 45 against the dark page (INNO-1223). Every dark
categorical slot and the context and other greys meet it. To get there, slot 3
went pale, slot 7 lost chroma to stay clear of the critical red, and the two
greys mix toward neutral step 11, because no dark neutral step sits between
Lc 31 and 79.

`getContrastColor` in `@oztix/roadie-core/colors` picks white or black text
by the higher APCA |Lc|, through the same `apcaLc` helper as the dataviz
checks. It used WCAG 2 until INNO-1225, and the switch changed its public
output: mid-tones such as the accent strong fill (`#0191eb`) now return
white instead of black. It shipped as a minor while the release was held,
before any consumer had installed the rest of the APCA work.

Delta text on a data card is held to Lc 60 (INNO-1224). It renders as one
short figure at 14px semibold, with an arrow and a spoken description, so it
reads as a label rather than body text. The card's neutral label, context,
and value text still meet body text's Lc 75. In dark mode, success step 9
measured Lc 57.4 and danger step 9 measured Lc 47.5 on the card. The good status now follows success
step 11, as it already does in light mode. The critical status is a fixed
coral red, `oklch(0.798 0.116 20)`, at Lc 63.3. A brighter red at its old hue
sits within ΔE 12 of the amber and dusty rose chart slots, so its hue leans 8
degrees toward pink. Light mode is unchanged.

## Links

- INNO-1182, white on the accent strong fill
- INNO-1148, decision 5 as updated on 9 October 2026
- INNO-1132, the accessibility check
- INNO-1198, the chosen day's fill in dark mode
- INNO-1223, dark chart marks and greys
- INNO-1225, `getContrastColor` switched to APCA
- INNO-1224, dark delta text
