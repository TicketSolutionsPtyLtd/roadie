---
'@oztix/roadie-components': patch
---

Printing a page inside `Navigator` now prints the top pane as a document: its title and all of its content, flowing across pages, with the navigation, the other panes, the inspector, and the pane's Back, Close, actions, search, footer, and scrollbar left off the paper. Before, a print was the whole frame, cut off at one screen's height. A `Pane` outside a `Navigator` prints whole too. To print `Pane.Actions`, `Pane.Search`, or `Pane.Footer` anyway, give it a display for print in `className`, such as `print:flex`. Hide anything else with `print:hidden`.
