---
'@oztix/roadie-core': patch
---

Shrink the `intent-*` utilities by about a fifth. Each intent now sets its own scale, `--intent-0` to `--intent-13`, and writes its roles against it, so every `--intent-*` resolves to the same value as before, in both themes and when an intent is applied through a variant. The compiled sheet is about 9 KB smaller, and an app's sheet saves more for each intent it applies through a variant. The `@supports not (color-mix())` fallback fills for `intent-brand-secondary`, `intent-success` and `intent-warning` are gone; only browsers below Tailwind CSS v4's floor used them.
