---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Skeleton`, a placeholder that holds the space content will occupy while it
loads. One component with a `shape` variant: `text` is a line at the inherited
line height, `block` is a panel, `circle` is an avatar. Width and height come
from Tailwind utilities, so a paragraph or a list row is several Skeletons in a
grid. The root is `aria-hidden` and carries `data-slot='skeleton'`.

Core adds the `--duration-ambient` token (1800ms) and the
`animate-pulse-subtle` utility it drives. Under `prefers-reduced-motion` the
pulse resolves to a static tint.
