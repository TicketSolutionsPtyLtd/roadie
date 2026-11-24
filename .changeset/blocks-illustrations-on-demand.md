---
'@oztix/roadie-blocks': patch
---

Load a block's spot illustration on its own, by name, instead of every block carrying the whole set. Hero, Cards, Side by side, Call to action, Rich text, and Stats each ship about 80 kB less in a browser. A server render still draws the illustration straight away, and hydration keeps it. A block first rendered in the browser holds the illustration's box at its final size while it loads, then draws it there, so nothing moves.
