# @oztix/roadie-lint-plugin

Lint rules that catch [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie)
mistakes in apps: Phosphor icon imports, sizes, and weights, `dark:` variants,
hex colour classes, arbitrary radius and z-index values, and a `Card`
without `Card.Content`. It runs in ESLint 9 and 10 (flat config) and in
oxlint 1.88 or later.

```bash
pnpm add -D @oztix/roadie-lint-plugin
```

```js
// eslint.config.js
import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended]
```

```json
// .oxlintrc.json
{
  "extends": [
    "./node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json"
  ]
}
```

It was `@oztix/roadie-eslint-plugin` before 0.2.0. The
[linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists every rule, the `oxlint.config.ts` setup, and how to choose your own.
