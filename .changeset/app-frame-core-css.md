---
'@oztix/roadie-core': minor
---

Add `animate-pop-tap` — a 200ms tap response, where `animate-pop` at 600ms reads
as a notification.

Add the `navigator-expanded` variant, which Navigator's expanded vertical
navigation is styled with, plus `@oztix/roadie-core/navigator`.

`@oztix/roadie-core/navigator` also exports `getNavigatorExpandedScript`, an
optional head script that lets a static site paint a persisted expanded vertical
navigation before hydration, with the cookie name and serializer it reads.

Add `is-translucent`, which lets content show through a raised or floating
surface's fill under a backdrop blur. It pairs with `emphasis-raised`,
`emphasis-floating` or `bg-raised`, keeps their rim light and shadow, and falls
back to the solid fill without `backdrop-filter` support or under
`prefers-reduced-transparency: reduce`. On an `is-interactive-field`, the
field's hover, focus and invalid fills still win.
