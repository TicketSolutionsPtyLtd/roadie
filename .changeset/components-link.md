---
'@oztix/roadie-components': minor
---

New `Link` in `@oztix/roadie-components/link`, a text link that routes like
every link-bearing component: internal hrefs go through the Link given to
`RoadieProvider`, external ones open in a new tab, and unsafe ones are
refused. Its `emphasis` sets the underline: `normal`, the default, keeps the
text colour with an accent underline, the same as links in `.prose`;
`strong` colours the text too; and `subtle` underlines only on hover or
keyboard focus. `intent` colours the underline, and a strong link's text,
and the focus ring comes from `is-interactive`.
