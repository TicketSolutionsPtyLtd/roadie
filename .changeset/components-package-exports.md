---
'@oztix/roadie-components': minor
---

Add exports for packages built on Roadie, which `@oztix/roadie-maps` uses. `@oztix/roadie-components/field` exports `FieldContext` and the `FieldContextValue` type, to give controls inside a control an empty field. `@oztix/roadie-components/link` exports `RoadieRoutedLink`, the routed anchor under `Link` with no link styling. `@oztix/roadie-components/toolbar` exports `toolbarSurfaceVariants`, for a control that sits beside a toolbar. The new `@oztix/roadie-components/cascade` exports `intentVariants` and the `RoadieIntent` type, and `useAccentScopeProps` and `AccentScopeContext`, which carry a nested `ThemeProvider`'s accent onto a layer portalled out of the page.
