---
"@oztix/roadie-widgets": minor
---

Add a `context: 'collection' | 'event'` prop to `CartDrawer` (both skins) that
drives the open-state secondary button. The button is now **"Open cart"**
(closed) / **"Browse events"** (open):

- `context: 'event'` — "Browse events" navigates to the collection page so the
  user can browse more events.
- `context: 'collection'` (default) — "Browse events" just closes the drawer
  (the collection page is already behind it).

The browse target is built **inside the package** from the server-trusted
`collectionId` (`buildBrowseHref` → validated by `isSafeRelativePath`) and routed
through `onNavigate`. We deliberately don't accept a consumer-supplied browse URL
or navigate callback: a tainted value (e.g. a `redirect=` query param) could turn
"Browse events" into an open redirect, whereas internal construction guarantees
`onNavigate` only ever receives a same-origin, collectionId-derived path.

Backward-compatible: omitting `context` defaults to `'collection'`, preserving
the prior close-on-secondary-button behaviour (only the label changes).
