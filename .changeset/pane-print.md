---
'@oztix/roadie-components': patch
---

Printing a page inside `Navigator` now prints the top pane as a document: its title and all of its content, flowing across pages, with the navigation, the other panes, the inspector, and the pane's Back, Close, actions, search, footer, and scrollbar left off the paper. Before, a print was the whole frame, cut off at one screen's height. A `Pane` outside a `Navigator` prints whole too. Hide anything else with `print:hidden`.
