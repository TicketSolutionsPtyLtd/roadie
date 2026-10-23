---
'@oztix/roadie-lint-plugin': minor
---

Breaking: `@oztix/roadie-lint-plugin` is the new name of `@oztix/roadie-eslint-plugin`, and it now runs in oxlint as well as ESLint. To upgrade, swap the package in `package.json` and change your config's import to the new name. The rules, their `roadie/` IDs, and `configs.recommended` are the same.

For oxlint 1.88 or later, extend `./node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json` from `.oxlintrc.json`, or import `@oztix/roadie-lint-plugin/oxlint/recommended.json` in `oxlint.config.ts`. The preset loads the plugin as `roadie`, so rule IDs match ESLint's. `eslint` and `oxlint` are both optional peer dependencies, so an app that uses one doesn't get a missing-peer warning for the other. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/) shows both setups.
