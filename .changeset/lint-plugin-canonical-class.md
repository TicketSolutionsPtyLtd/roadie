---
'@oztix/roadie-lint-plugin': minor
---

Add `canonical-class`, which fails a Tailwind class not in its canonical form, such as `p-[16px]`, and fixes it to its canonical form, such as `p-4`. It reads Roadie's theme through `tailwindcss`, a new optional peer dependency at 4.1.15 or later. The `recommended` preset turns it on as an error in ESLint and oxlint, so an app can report new errors after upgrading: run the linter with `--fix` to rewrite them.
