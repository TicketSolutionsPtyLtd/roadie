---
'@oztix/roadie-components': minor
---

New `Link` in `@oztix/roadie-components/link`, a text link that routes like
every link-bearing component: internal hrefs go through the Link given to
`RoadieProvider`, external ones open in a new tab, and unsafe ones are
refused. Its `emphasis` sets the look: `normal`, the default, keeps the text
colour with an accent underline that grows into a tint on hover or keyboard
focus, the same as links in `.prose`; `strong` colours the text and fills it
with a tint from the left; and `subtle` shows its underline only on hover or
keyboard focus. `normal` and `subtle` stay accent inside any intent unless
given their own `intent`; `strong` follows the surrounding intent. The focus
ring comes from `is-interactive`, and reduced motion skips the transitions.
