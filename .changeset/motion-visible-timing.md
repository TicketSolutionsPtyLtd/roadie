---
'@oztix/roadie-components': minor
---

Two components move onto Roadie's motion tokens, and each looks a little different:

- Badge's pulsing indicator uses `animate-pulse-subtle` (1.8s, fading to 60%) in place of Tailwind's `animate-pulse` (2s, fading to 50%).
- Image's fade-in uses `--duration-slower` (still 400ms) with `--ease-standard` in place of the CSS `ease` keyword.
