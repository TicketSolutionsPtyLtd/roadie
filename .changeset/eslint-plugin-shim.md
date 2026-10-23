---
'@oztix/roadie-eslint-plugin': patch
---

Deprecated: `@oztix/roadie-eslint-plugin` is now `@oztix/roadie-lint-plugin`, and this is the last release of the old name. It depends on the new package, re-exports it, and warns once when it loads outside production. To move, swap the package in `package.json` and change your config's import to the new name. The rules, their `roadie/` IDs, and `configs.recommended` are the same.
