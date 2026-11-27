---
'@oztix/roadie-components': patch
---

`NumberField`'s subtler stepper rings at 30% in dark mode, as every focus ring now does, where it was 20%. It reads `--focus-ring-opacity` in both modes, no longer the deprecated `--focus-ring-opacity-dark`.
