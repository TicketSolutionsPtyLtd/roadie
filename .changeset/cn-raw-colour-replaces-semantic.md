---
'@oztix/roadie-core': patch
---

Fix `cn()` keeping a semantic colour when a raw or chart colour follows it. `cn('text-normal', 'text-neutral-9')` now returns `text-neutral-9`, as `cn('text-neutral-9', 'text-normal')` already returned `text-normal`, for text, background (including `surface-floating`), and border colours. A `className` with a raw or chart colour now overrides a component's semantic colour, where CSS order used to decide which won.
