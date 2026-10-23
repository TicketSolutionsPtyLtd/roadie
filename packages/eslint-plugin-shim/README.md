# @oztix/roadie-eslint-plugin

This package is now
[`@oztix/roadie-lint-plugin`](https://www.npmjs.com/package/@oztix/roadie-lint-plugin),
and this name is deprecated. Its last release, 0.1.2, re-exports the new
package and warns once when it loads. The rules, their `roadie/` IDs, and
`configs.recommended` are the same.

To move, swap the package and change the import in your lint config:

```bash
pnpm remove @oztix/roadie-eslint-plugin
pnpm add -D @oztix/roadie-lint-plugin
```

```js
// eslint.config.js
import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended]
```

The new name also runs in oxlint. The
[linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
shows both setups.
