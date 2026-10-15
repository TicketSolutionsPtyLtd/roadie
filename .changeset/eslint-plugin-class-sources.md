---
'@oztix/roadie-eslint-plugin': patch
---

The class rules now also read `tv()` from tailwind-variants, and a `const`
that a class attribute or class function names, one level deep, when it holds
a string, array, or object. `cn(variants[size])` is checked against the
strings in `const variants = { … }`. This can report new errors in code that
passed before, such as a `dark:` variant in a variants map.

`phosphor-icon-weight` no longer reports an icon in a fallback or ternary on
`Navigator.Item`, such as `icon={icons[href] ?? <HouseIcon />}`.
