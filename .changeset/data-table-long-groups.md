---
'@oztix/roadie-components': patch
---

`DataTable` opens and closes the groups of a table of more than 50 rows at once, rather than growing them open like an Accordion. Each frame of that motion laid the whole table out again, so a 200-row table dropped about one frame in ten as a group opened; it now drops none. Shorter tables keep the motion.
