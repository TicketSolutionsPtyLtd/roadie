# @oztix/eslint-plugin-roadie

ESLint rules that catch [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie)
mistakes in apps: Phosphor icon imports, sizes, and weights, `dark:` variants,
hex colour classes, and arbitrary radius and z-index values.

```bash
pnpm add -D @oztix/eslint-plugin-roadie
```

```js
// eslint.config.js
import roadie from '@oztix/eslint-plugin-roadie'

export default [roadie.configs.recommended]
```

It needs ESLint 9 or 10 with a flat config. The
[linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists every rule and how to choose your own.
