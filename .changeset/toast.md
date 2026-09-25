---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Toast`, a brief message that confirms an action or reports its result.
Mount `Toast.Provider` with a
`Toast.Viewport` once at the app root, then call `useToastManager().add({
title, description, intent, actionProps })` from any component, or
`createToastManager()` from outside React. `intent` (`success`, `danger`,
`warning` or `info`) colours the toast and leads it with a matching icon,
`actionProps` adds a small button such as Undo or Retry, and `promise` shows a
spinner until the work settles. Toasts stack at the bottom end of wide screens
and span the bottom of small ones, fan out on hover or focus, and swipe away.
Core adds the `motion-toast` utility that stacks and animates them.
