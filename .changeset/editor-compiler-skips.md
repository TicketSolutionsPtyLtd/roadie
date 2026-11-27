---
'@oztix/roadie-editor': patch
---

The editor's settings popovers and its docked toolbar do less work on each render. The React Compiler skipped the two hooks behind them, over a `??=` and a `&&=` it can't compile, and now memoises both.
