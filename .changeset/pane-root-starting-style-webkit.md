---
'@oztix/roadie-components': patch
---

Fix a Navigator root pane starting a `translate` transition in WebKit 27.2 when it mounts into a row that is pushing. The pane didn't move, but the transition ran for the length of the push.
