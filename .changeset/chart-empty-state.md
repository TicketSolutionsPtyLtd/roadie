---
'@oztix/roadie-charts': patch
---

A chart with no data, or one that can't draw, now shows an `EmptyState` with an
icon: small inside a `Chart` card and medium on its own, in danger colours when
the chart can't draw. A card's plot grows past its height when the state's
title wraps. A small multiples panel keeps a small text-only state at its own
height. The title is a paragraph, since a chart can't know the page's heading
outline, and the `chart-empty` and `chart-error` slots now sit on the
`EmptyState` wrapper rather than the text. The static SVG renderer keeps its
text message.
