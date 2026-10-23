---
'@oztix/roadie-lint-plugin': minor
---

Add the testing preset, which catches jsdom tests that check what only a browser can: `roadie/no-css-class-in-jsdom` fails a `calc()`, container query, or breakpoint class in `toHaveClass`, `roadie/no-css-source-in-jsdom` fails a test that reads CSS source, and `roadie/no-layout-fake-in-jsdom` fails a faked layout read, such as `getBoundingClientRect`, or a faked viewport media query.

In ESLint, spread `configs.testing` into your config array. In oxlint, extend `oxlint/testing.json`. The rules apply to `*.test.{js,jsx,ts,tsx}` files and skip `*.browser.test.*` files, where a browser test belongs. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/#testing) shows both setups.
