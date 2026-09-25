---
'@oztix/roadie-core': minor
---

Add dashboard support. `@oztix/roadie-core/dashboard` describes a dashboard as
JSON, with a Zod schema, a JSON Schema export for tool inputs, and
`validateDashboard`, which reports every problem with its path, including rows
that leave gaps, copy that will truncate, and unknown keys. A zod-free
`@oztix/roadie-core/dashboard-layout` subpath exposes the card sizes, spans,
tracks, `findRowGaps` and `COPY_LIMITS` for UI code that must not load Zod.
`@oztix/roadie-core/dataviz` gains `formatValue` and delta helpers in the
house number formats, and `chartHex` now returns chrome colours for static
renderers. Chart ink now follows nested `.dark` and `intent-*` sections, the
highlight's hex fallback uses the default accent hue, and chart marks get
texture patterns under forced colours and print.
