---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Toast`, a brief message that confirms an action or reports its result.
Mount `Toast.Provider` with a `Toast.Viewport` once at the app root, then call
`useToastManager().add({ title, description, intent, actionProps })` from any
component, or `createToastManager()` from outside React. `intent` (`success`,
`danger`, `warning` or `info`) colours the toast and leads it with a matching
icon, `actionProps` adds a small button such as Undo or Retry, and `promise`
shows a spinner until the work settles. `Toast.Viewport` takes a `position`
(`bottom-end` by default, `bottom-center`, `top-end` or `top-center`); small
screens always span the chosen edge. Set `--toast-viewport-offset-bottom` (or
`-top`) to clear fixed UI such as a checkout bar. Toasts fan out on hover or
focus and swipe away towards their edge. Core adds the `motion-toast` utility
that stacks and animates them from either edge: toasts enter, restack and
snap back on a spring and leave quickly. Core also adds `--ease-spring-lively`,
a spring with a visible bounce (about 9% overshoot) for transforms that should
catch the eye.
