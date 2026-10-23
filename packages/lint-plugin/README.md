# @oztix/roadie-lint-plugin

Lint rules that catch [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie)
mistakes in apps: Phosphor icon imports, sizes, and weights, `dark:` variants,
hex colour classes, arbitrary radius and z-index values, and a `Card`
without `Card.Content`. Its `testing` preset catches tests that sleep,
assert class strings, or check in jsdom what only a browser can, such as
layout or CSS. Lint with oxlint 1.88 or later.

```bash
pnpm add -D @oztix/roadie-lint-plugin oxlint
```

```json
// .oxlintrc.json
{
  "extends": [
    "./node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json"
  ]
}
```

An app that can't move to oxlint yet can run the same rules in ESLint 9 or
10, on flat config.

```js
// eslint.config.js
import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended]
```

It was `@oztix/roadie-eslint-plugin` before 0.2.0. The
[linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists every rule, the testing preset, the `oxlint.config.ts` setup, and how
to choose your own.
