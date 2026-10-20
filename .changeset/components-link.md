---
'@oztix/roadie-components': minor
---

New `Link` in `@oztix/roadie-components/link`, a text link that routes like
every link-bearing component: internal hrefs go through the Link given to
`RoadieProvider`, external ones open in a new tab, and unsafe ones are
refused. Its `emphasis` sets the look: `normal`, the default, keeps the text
colour with an accent underline that grows into a tint on hover or keyboard
focus, the same as links in `.prose`; `strong` colours the text in its intent and
fills it from the left like `emphasis-strong`, recolouring each letter as the
fill reaches it; and `subtle` shows its underline only on hover or
keyboard focus. `normal` and `subtle` stay accent inside any intent unless
given their own `intent`, `intent='neutral'` included; `strong` follows the surrounding intent, neutral included. The focus
ring comes from `is-focusable`, and reduced motion skips the transitions.
