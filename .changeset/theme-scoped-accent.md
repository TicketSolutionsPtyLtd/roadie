---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

A nested `ThemeProvider` scopes its accent to its own subtree. It sets `--accent-hue` and `--accent-chroma` on a `display: contents` wrapper marked `data-accent-scope`, which renders on the server too, and Roadie's CSS declares the accent and neutral scales, the default intent, the shadows, and the chart ink again on that wrapper. Before, a nested provider wrote its accent to `:root`: it lost to the root's on a cold load, took over the whole page when it mounted later, and kept the page on its accent after it unmounted. Now the root's accent stays on everything outside the nested provider, and the portals of `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip`, `Select`, `Combobox`, and `Autocomplete` carry the nested accent to popups that open from inside it. A parent's selectors for its direct children, such as `*:` variants, now see the wrapper instead of the nested provider's children. A nested provider's subtree starts at the neutral intent, and browsers without OKLCH keep the root's accent inside it.

The root provider keeps a server-injected accent style that already holds its accent (from `getAccentStyleSync`, `getAccentStyleTagSync`, or `getBootstrapScript`) instead of rewriting it on hydration, and writes the accent in the same form. `RoadieProvider`'s warning for a `RoadieProvider` inside a `ThemeProvider` now says the inner theme is scoped to its subtree.

Update `@oztix/roadie-core` together with `@oztix/roadie-components`, since the wrapper needs core's scoped selectors to change the scales.
