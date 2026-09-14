---
'@oztix/roadie-components': minor
'@oztix/roadie-widgets': minor
---

**Peer dependency change: React 19.2 or later is now required.** The `react`
and `react-dom` peer ranges move from `^19.0.0` to `^19.2.0` in both packages.
Upgrade React to 19.2 before taking this release. Roadie now uses
`useEffectEvent`, which first shipped in React 19.2. The widgets' React peer
stays optional, so Vue-only installs are unaffected.
