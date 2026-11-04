---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
'@oztix/roadie-editor': patch
---

Stop publishing `.d.ts.map` files. They pointed at source the package doesn't ship, so go-to-definition landed on nothing. The JavaScript source maps still embed their source, so stack traces and debuggers still show it.
