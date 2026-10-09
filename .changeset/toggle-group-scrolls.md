---
'@oztix/roadie-components': patch
---

A horizontal `ToggleGroup` that runs out of room now scrolls sideways, as
`Tabs` does, instead of squashing its items until the labels overflow. It
scrolls the pressed item into view, and a focus ring stays inside the track.
Items keep equal widths while they fit. `DashboardPeriod`'s Compare choices
scroll along one row instead of wrapping onto a second.
