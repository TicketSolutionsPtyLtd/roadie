---
'@oztix/roadie-blocks': patch
---

`Cards` no longer slows an app built with Tailwind 4.3.3 or earlier. Its linked `overlap` and `photo` tiles grew their photo on keyboard focus with a `group-has-*` class, which those releases compile to a selector ending in `*`, so the browser restyled the whole page whenever anything changed under a `:has()` anchor. The tiles now use `in-[…:has()]`, which ends on the class in every release. They look and behave as before, and each carries `data-slot='cards-tile'`.
