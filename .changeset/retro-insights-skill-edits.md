---
'roadie-skills': patch
---

`/roadie:test` and `/roadie:review` name three tests that can't fail (an assertion the default layout meets, one on the wrong element, and a threshold zero meets), and review mutation-checks every new class and asserted element, restoring the file in the same command. `/roadie:implement` checks changeset, docs, and spec claims against a test or a measurement and runs touched browser tests in WebKit and Firefox before the demo, `/roadie:pr` treats the changeset and numbers as claims, `/roadie:shepherd` lints and typechecks the files both sides touched after a rebase, and `/roadie:demo`'s `shoot.mjs` scrolls to the first visible match and fails if it isn't in view.
