---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
---

Add `getImageFadeScript()` to `@oztix/roadie-core/image`. Put it in the app's `<head>` and a server-rendered `Image` with `placeholder='blur'` fades in as soon as its bytes arrive, before hydration. Without it, those images still show at once with no fade.
