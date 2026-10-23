---
'roadie-skills': patch
---

`/roadie:audit` runs the lint plugin in oxlint, and falls back to ESLint only when oxlint can't run. An app without an oxlint config gets a one-off run from a temporary config, so an app on a legacy `.eslintrc` is checked too.
