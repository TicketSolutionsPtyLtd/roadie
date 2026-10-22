# @oztix/roadie-lint-plugin

## 0.1.1

### Patch Changes

- 6127097: The class rules now also read `tv()` from tailwind-variants, and a `const`
  that a class attribute or class function names, one level deep, when it holds
  a string, array, or object. `cn(variants[size])` is checked against the
  strings in `const variants = { … }`. This can report new errors in code that
  passed before, such as a `dark:` variant in a variants map.

  `phosphor-icon-weight` no longer reports an icon in a fallback or ternary on
  `Navigator.Item`, such as `icon={icons[href] ?? <HouseIcon />}`.

- 4ece49e: First release of `@oztix/roadie-eslint-plugin` through the release workflow,
  published with npm provenance. The package holds ESLint rules that catch Roadie
  mistakes in apps. Add `roadie.configs.recommended` to a flat
  `eslint.config.js` (ESLint 9 or 10) to turn on all eight rules as errors:
  `phosphor-icon-suffix`, `phosphor-icon-size-prop`, `phosphor-icon-weight`,
  `no-dark-variant`, `no-hex-colour-class`, `no-arbitrary-z-index`,
  `no-arbitrary-radius`, and `card-content`. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/)
  lists what each one fails and how to fix it.
