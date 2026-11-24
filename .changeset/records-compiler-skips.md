---
'@oztix/roadie-components': patch
---

`RecordTable`, `RecordGrid` and the other record layouts re-render less often. The React Compiler skipped `useRecords` and six more Records functions, over a `??=` or a `try`/`finally` it can't compile, so every row rendered again whenever the parent did. They compile now: a 100-row table whose parent renders again with the same props re-renders 5 components where it re-rendered 178, and typing a character in its search re-renders 794 where it re-rendered 1,075.
