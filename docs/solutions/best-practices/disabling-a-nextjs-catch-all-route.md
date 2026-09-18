---
title: Renaming a Next.js catch-all route does not disable it, so the test that proves it is load-bearing returns a false negative
date: 2026-09-16
category: best-practices
problem_type: verification_method
components:
  - docs
keywords:
  - next.js
  - parallel routes
  - intercepting routes
  - catch-all
  - app shell
  - navigator
  - false negative
severity: low
related_files:
  - docs/src/app/foundations/navigation/page.tsx
---

# Disabling a Next.js catch-all route

## Symptom

The app-shell recipe pairs a parallel route slot with an intercepting route, and
puts a null catch-all in the slot:

```tsx
// app/(shell)/@detail/[...catchAll]/page.tsx
export default function CatchAll() {
  return null
}
```

The catch-all exists to clear a stale detail pane. Without it, Next keeps the
last intercepted content mounted in the slot after you navigate away.

To prove it is load-bearing you disable it and expect the stale pane back. Rename
the folder to `[...catchAllDisabled]`, reload, navigate away, and the pane still
clears. The obvious reading is that the catch-all was never needed.

## Root cause

The brackets and the ellipsis are what make the folder match every path. The
identifier inside them only names the key the params object uses. So
`[...catchAllDisabled]` is still a live catch-all matching exactly the same
paths, under a different params key that nothing reads. Nothing was disabled, and
the pane clears for the same reason it always did.

## Fix

Rename to something with no brackets at all, which removes the route from the
router rather than renaming its params key:

```
app/(shell)/@detail/_catchAll/page.tsx
```

A leading underscore makes it a private folder, so Next does not route it. Reload
and navigate away, and the stale pane reproduces.

## Prevention

- When a route folder's name is part of its matching behaviour, disable it by
  moving it out of the routable tree, not by renaming the identifier inside the
  brackets. The same applies to `[id]`, `[[...optional]]` and route groups.
- A verification that passes after you "disabled" something is a claim about your
  disabling, not about the thing. Confirm the route is gone before reading the
  result.
