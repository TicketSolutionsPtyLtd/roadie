---
'roadie-skills': patch
---

The `/roadie:migrate` codemods no longer rewrite a local variable or parameter
that shadows a Roadie import. They report an `import()` of a module with a
deprecated export, and `widgets-renames` moves an `import()` of
`/cart-drawer/core` to `/cart`.
