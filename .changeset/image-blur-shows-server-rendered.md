---
'@oztix/roadie-components': patch
---

Fix a server-rendered `Image` with `placeholder='blur'` staying hidden until React hydrates, which held an already-downloaded hero at its blurred preview for seconds on a slow phone. An image whose `src` is in the server HTML now shows as soon as the browser has it, over the blurred preview, without the fade. An image that mounts on the client, or a `defer`red one whose `src` arrives after hydration, still fades in.
