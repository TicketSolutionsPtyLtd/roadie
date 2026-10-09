---
'@oztix/roadie-widgets': minor
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Widgets now ship `@oztix/roadie-widgets/roadie.manifest.json`, with the same shape as the other packages' manifests. It lists every export, including the Vue skins, and describes the React components (`CartDrawer`, `CartExpiryDialogs` and `CartContents`) with their props and docs pages. The Vue skins appear as exports only. Deprecated re-exports, such as `CartExpiryModals` and the `cart-drawer/core` shim, are listed under `deprecations`.

Every component in the components and charts manifests now has a `docs` link. The spot illustrations, `RoadieProvider`, `RoadieLinkProvider`, `ThemeProvider`, `RequiredIndicator`, `OptionalIndicator`, `LegendKey` and `DashboardView` link the page or section that documents them.
