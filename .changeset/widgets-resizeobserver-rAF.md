---
"@oztix/roadie-widgets": patch
---

Fix `ResizeObserver loop completed with undelivered notifications` warning in
the cart-drawer drag composable. Header/footer height measurements taken
inside the observer callback now schedule their state writes via
`requestAnimationFrame`, so the observer no longer dispatches a fresh layout
synchronously within its own callback frame.
