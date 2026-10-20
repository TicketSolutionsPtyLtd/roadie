---
'@oztix/roadie-eslint-plugin': patch
---

First release of `@oztix/roadie-eslint-plugin` through the release workflow,
published with npm provenance. The package holds ESLint rules that catch Roadie
mistakes in apps. Add `roadie.configs.recommended` to a flat
`eslint.config.js` (ESLint 9 or 10) to turn on all eight rules as errors:
`phosphor-icon-suffix`, `phosphor-icon-size-prop`, `phosphor-icon-weight`,
`no-dark-variant`, `no-hex-colour-class`, `no-arbitrary-z-index`,
`no-arbitrary-radius`, and `card-content`. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists what each one fails and how to fix it.
