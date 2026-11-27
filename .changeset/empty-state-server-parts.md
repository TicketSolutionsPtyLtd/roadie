---
'@oztix/roadie-components': patch
---

`EmptyState`'s title, description, and illustration render as Server Components: they size themselves from the root's new `data-size` attribute instead of a context, so in a server tree only `EmptyState.IconTile` and the size it reads ship to the browser. A `DataCard`, `StatTile`, or `Dashboard` rendered from a Server Component ships 5 fewer client modules, about 0.9 KB brotli less.

A plain `className` on one of those parts no longer replaces its `sm` or `lg` size style, since those are now the `empty-state-sm:` and `empty-state-lg:` variants. Prefix the class to restyle a part at those sizes, as in `className='empty-state-sm:text-sm'`. A nested `EmptyState` keeps its own size.
