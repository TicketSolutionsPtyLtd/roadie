---
'@oztix/roadie-components': minor
---

Add `nonce` to `RoadieProvider`, your content security policy's nonce, which Roadie puts on the inline scripts `Kbd` and a standalone `DateTime` render on the server so they paint their final form. Without it, a policy that blocks inline scripts leaves them to settle after mount.
