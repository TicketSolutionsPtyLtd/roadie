---
'@oztix/roadie-components': patch
---

`Navigator`'s collapsed vertical navigation folds items into More on the server's first paint, through a container query on the cluster's height, rather than after the client measures it. Nothing moves when the page hydrates. The server markup carries a small inline `<style>` until the client has measured.
