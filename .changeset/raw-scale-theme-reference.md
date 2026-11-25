---
'@oztix/roadie-core': patch
---

Stop writing the raw colour scale tokens into every app's Tailwind theme layer. `@import '@oztix/roadie-core/css'` emitted 98 declarations such as `--color-brand-5: var(--color-brand-5)`, which tokens.css always overrode, so an app's sheet is about 3.9 kB smaller before compression. Raw scale utilities such as `bg-brand-5` and `text-danger-9`, and every token's value, light and dark, are unchanged.
