---
'@oztix/roadie-eslint-plugin': patch
---

First release of `@oztix/roadie-eslint-plugin` through the release workflow,
published with npm provenance. The rules are unchanged from 0.1.0: ESLint rules
that catch Roadie mistakes in apps. Add `roadie.configs.recommended` to a flat
`eslint.config.js` (ESLint 9 or 10) to turn on all seven rules as errors:
`phosphor-icon-suffix`, `phosphor-icon-size-prop`, `phosphor-icon-weight`,
`no-dark-variant`, `no-hex-colour-class`, `no-arbitrary-z-index`, and
`no-arbitrary-radius`. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists what each one fails and how to fix it.
