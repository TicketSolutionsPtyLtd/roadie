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

## Links

- INNO-1182, white on the accent strong fill
- INNO-1148, decision 5 as updated on 9 October 2026
- INNO-1132, the accessibility check
