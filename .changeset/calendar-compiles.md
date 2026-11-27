---
'@oztix/roadie-components': patch
---

`Calendar` re-renders less of itself. The React Compiler skipped `Calendar` because of two React hooks lint disables, so each hover, pick or arrow key rendered its month arrows and their icons again. It compiles now. Hovering or picking a day renders 4 fewer components and an arrow key 8 fewer. The memoisation adds about 2 kB of brotli to `@oztix/roadie-components/calendar`.
