# @oztix/roadie-eslint-plugin

ESLint rules that catch [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie)
mistakes in apps: Phosphor icon imports, sizes, and weights, `dark:` variants,
hex colour classes, arbitrary radius and z-index values, and a `Card`
without `Card.Content`.

```bash
pnpm add -D @oztix/roadie-eslint-plugin
```

```js
// eslint.config.js
import roadie from '@oztix/roadie-eslint-plugin'

export default [roadie.configs.recommended]
```

It needs ESLint 9 or 10 with a flat config. The
[linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
lists every rule and how to choose your own.
