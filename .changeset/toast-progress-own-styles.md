---
'@oztix/roadie-components': patch
---

`Toast.Progress` styles itself with `animate-time-left` and classes for its pauses, and the stylesheet's `toast` rules are gone. Its inline variable is now `--time-left` rather than `--toast-timeout`. Nothing looks different.
