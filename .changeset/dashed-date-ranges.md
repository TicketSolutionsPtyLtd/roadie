---
'@oztix/roadie-core': patch
---

Fix `parseDatePhrase` reading nothing for days joined by a dash. `oct 22-24`, `22-24 oct`, and `1st–14th mar` now read as the days between, as `22 to 24 oct` does, so `Records.Search` suggests them too.
