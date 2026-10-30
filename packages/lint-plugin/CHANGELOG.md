# @oztix/roadie-lint-plugin

## 0.2.1

### Patch Changes

- f365cf1: Fix three lint rules that missed problems or read a condition as class text. `roadie/no-arbitrary-radius` now reports a raw length in a constant even when the constant was used elsewhere first, such as `cn(pad)` before `cn('rounded-(--r)', pad)`. The class string rules no longer read a condition as class text, so `cn(path === '/faq#top' && 'bg-strong')` and `cn({ 'bg-strong': hash !== '#top' })` pass `roadie/no-hex-colour-class`. `roadie/phosphor-icon-weight` now reports a wrong weight on a `Navigator.Item` icon, such as `weight='thin'`, while still letting the icon leave its weight out.
- a0b7a62: Fix `roadie/phosphor-icon-suffix` missing icons that come from scope rather than an import, such as in a live code editor. A bare name listed in `settings.roadie.phosphorIcons`, such as `Heart`, now fails where the code renders it, as `<Heart />`, or passes it as a prop, as `icon={Heart}`, with a message to use `HeartIcon`.

## 0.2.0

### Minor Changes

- 922aa70: Add `canonical-class`, which fails a Tailwind class not in its canonical form, such as `p-[16px]`, and fixes it to its canonical form, such as `p-4`. It reads Roadie's theme through `tailwindcss`, a new optional peer dependency at 4.1.15 or later. The `recommended` preset turns it on as an error in ESLint and oxlint, so an app can report new errors after upgrading: run the linter with `--fix` to rewrite them.
- 5c1b2fd: Breaking: `@oztix/roadie-lint-plugin` is the new name of `@oztix/roadie-eslint-plugin`, and it now runs in oxlint as well as ESLint. To upgrade, swap the package in `package.json` and change your config's import to the new name. The rules, their `roadie/` IDs, and `configs.recommended` are the same.

  For oxlint 1.88 or later, extend `./node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json` from `.oxlintrc.json`, or import `@oztix/roadie-lint-plugin/oxlint/recommended.json` in `oxlint.config.ts`. The preset loads the plugin as `roadie`, so rule IDs match ESLint's. `eslint` and `oxlint` are both optional peer dependencies, so an app that uses one doesn't get a missing-peer warning for the other. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/) shows both setups.

- 32f8eff: Add the testing preset, which catches tests that can't be trusted: `roadie/no-css-class-in-jsdom` fails a `calc()`, container query, or breakpoint class in `toHaveClass`, `roadie/no-css-source-in-jsdom` fails a test that reads CSS source, `roadie/no-layout-fake-in-jsdom` fails a faked layout read, such as `getBoundingClientRect`, or a faked viewport media query, `roadie/no-cva-output-assertion` fails an assertion on the class string a variants function returns, and `roadie/no-fixed-sleep` fails a fixed wait, such as `setTimeout` inside a promise or `page.waitForTimeout`.

  In oxlint, extend `oxlint/testing.json`. In ESLint, spread `configs.testing` into your config array. The rules apply to `*.test.*` files. Tests that run in a real browser skip the jsdom rules: `*.browser.test.*` files, `*.spec.*` files, which Playwright runs, and files in an `e2e` folder. Those keep `roadie/no-fixed-sleep`, and a `*.test.*` file among them keeps `roadie/no-cva-output-assertion` too. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/#testing) shows both setups.

### Patch Changes

- f02f183: Update the README to lead with oxlint. ESLint 9 and 10 still run the same rules, for an app that can't move to oxlint yet.
- be9b30b: Add `meta.docs.url` to each rule, linking it to its section of the [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/), so an editor can open the guide from a reported rule ID.

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
