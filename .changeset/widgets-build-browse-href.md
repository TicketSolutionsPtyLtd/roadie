---
"@oztix/roadie-widgets": minor
---

`CartDrawer` (Vue + React) now builds the empty-state "Browse" target itself
from the trusted `collectionId` via a new `buildBrowseHref` core helper, so
consumers don't have to thread a request-param-derived value through to the
navigation sink. `browseHref` is now an optional prop — when omitted (or when
the supplied value fails `isSafeRelativePath`) the package builds the default:

```
/collection/cart/?id={collectionId}&redirect={current path+search}
```

This closes a class of `window.location.href` open-redirect findings (e.g.
Aikido) in consumer apps where a request-param-derived `browseHref` could
slip past server-side validation (a backslash-prefixed path like
`/\evil.com` is accepted as "relative" by .NET's `Uri.TryCreate`, but the
browser normalises it to a cross-origin redirect). The package now owns the
URL pattern; consumer apps drop `browseHref` from their drawer config.

Backward-compatible: existing consumers passing a `browseHref` keep working,
and unsafe values are sanitised by falling back to the built default.
