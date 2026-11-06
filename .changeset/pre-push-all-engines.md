---
'roadie-skills': patch
---

`/roadie:implement` and `/roadie:test` point to Roadie's pre-push hook, which now runs the touched browser tests in Chromium, Firefox, and WebKit, instead of a manual `--all-browsers` run.
