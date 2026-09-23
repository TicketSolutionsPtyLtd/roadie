---
'@oztix/roadie-components': minor
---

An inspector `Pane` now moves its content into a bottom drawer when its column
yields, so apps no longer write the content twice. Place a
`Pane.InspectorTrigger` anywhere in the same `Navigator`: it shows only while
the column has yielded and opens the drawer, which takes its name from the
inspector's `aria-label` and keeps the page readable behind it.

`reveal` on the inspector says its content should be seen. While the column
shows, it already is; once the column has yielded, `reveal` opens the drawer.
`onRevealChange` reports the trigger opening it and people dismissing it.

The drawer is a fixed `lg` sheet, so filtering the content can't resize it
under the user's thumb. `drawerSize` on the inspector picks another Drawer
size.
