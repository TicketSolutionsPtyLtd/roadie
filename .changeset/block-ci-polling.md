---
'roadie-skills': patch
---

`/roadie:shepherd` and `/roadie:release` wait on CI and npm without foreground polling: end the turn and let Auto-fix or `ci-monitor-event` messages wake the session, or run one watch command in the background. `/roadie:release` gives up waiting for npm after 20 minutes.
