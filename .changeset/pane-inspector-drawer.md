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

In the drawer, the inspector's own `Pane.Header` shows a Close in its top-left
corner, 24px from the drawer's top and side, and casts the drawer's scroll
shadow. Content without a `Pane.Header` gets a header holding just the Close.
The drawer sets `--pane-surface` to its raised fill, so sticky chrome inside
it mixes against the right colour.

`pane-inspector-yielded:` also applies to the inspector's own content once it's
in the drawer, so content can adapt to where it renders.

