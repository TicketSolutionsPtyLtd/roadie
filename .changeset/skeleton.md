---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Skeleton`, a placeholder that holds the space content will occupy while it
loads. One component with a `shape` variant: `text` is a line at the inherited
line height, `block` is a panel, `circle` is an avatar. Width and height come
from Tailwind utilities, so a paragraph or a list row is several Skeletons in a
grid. The root is `aria-hidden` and carries `data-slot='skeleton'`.

Core adds the `--duration-ambient` (1800ms) and `--duration-sweep` (2400ms)
tokens, the `animate-pulse-subtle` utility, and `animate-shimmer`, which adds a
highlight sweeping across the surface on top of that pulse. The highlight is an
overlay that translates, so it costs no layout and takes its colour from the
intent, not from white. Under `prefers-reduced-motion` the sweep is dropped and
the pulse resolves to a static tint.
