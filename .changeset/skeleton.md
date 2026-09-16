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
tokens, the `--sheen-shade` and `--sheen-highlight` colours, the
`animate-pulse-subtle` utility, and `animate-shimmer`, which crosses a surface
with a highlight over that pulse. The highlight is anchored to the viewport, so
every element wearing the class shares one sweep whatever its size, and it is
the lighter of the two tones in both themes. Under `prefers-reduced-motion` the
highlight is dropped and the pulse resolves to a static tint.
