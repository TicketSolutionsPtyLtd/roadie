---
'@oztix/roadie-illustrations': minor
---

Add `@oztix/roadie-illustrations/spot/load`, which loads one spot illustration by name without the rest of the set, for content that names its illustration, such as a CMS field. `isSpotIllustrationName` checks a saved name, `loadSpotIllustration(name)` resolves to its component, and `loadedSpotIllustration(name)` returns it once it has loaded. Under the `node`, `workerd`, and `edge-light` conditions every illustration is loaded already, so a server render never waits. It's about 2.9 kB before an illustration loads.
