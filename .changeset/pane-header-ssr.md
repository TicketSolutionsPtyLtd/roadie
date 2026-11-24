---
'@oztix/roadie-components': patch
---

`Pane.Header` renders on the server and keeps one control's height even with nothing in it, so a pane with its title in `Pane.BodyTitle` no longer jumps down 64px when it hydrates, and a skeleton pane starts its content at the same line as the loaded one. A header whose only content is Back or Close now keeps its height where the columns hide them, instead of disappearing. Leave `Pane.Header` out of a pane that should have no top chrome.
