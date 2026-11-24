---
'@oztix/roadie-components': patch
---

`RecordTable`, `RecordGrid` and the other record layouts re-render less often. The React Compiler skipped `useRecords` and six more Records functions, over a `??=` or a `try`/`finally` it can't compile, so a 100-row table rendered every row again whenever its parent rendered, even with the same props. They compile now, and it renders none of them. The memoisation adds about 4 kB of brotli to `@oztix/roadie-components/records` and to each layout built on it.
