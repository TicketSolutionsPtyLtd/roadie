---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Progress`, a bar for a task underway.
`<Progress value={40} label='Uploading' />` renders the label, the value and
the track; `valueText` swaps the percentage for text such as "120 of 400" and
reads it to screen readers. Pass `value={null}` while the length is unknown
and the bar sweeps across the track. The parts (`Label`, `Value`, `Track`,
`Indicator`) compose for custom layouts. The fill is the accent by default,
like `Meter`, and takes the intent when you pass `intent`, such as `success`
or `danger` once a task has ended. Core gains the `animate-indeterminate`
utility behind the sweep, which holds a still, soft bar under reduced motion.
