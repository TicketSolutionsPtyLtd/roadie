---
'@oztix/roadie-lint-plugin': minor
---

Add the testing preset, which catches tests that can't be trusted: `roadie/no-css-class-in-jsdom` fails a `calc()`, container query, or breakpoint class in `toHaveClass`, `roadie/no-css-source-in-jsdom` fails a test that reads CSS source, `roadie/no-layout-fake-in-jsdom` fails a faked layout read, such as `getBoundingClientRect`, or a faked viewport media query, `roadie/no-cva-output-assertion` fails an assertion on the class string a variants function returns, and `roadie/no-fixed-sleep` fails a fixed wait, such as `setTimeout` inside a promise or `page.waitForTimeout`.

In oxlint, extend `oxlint/testing.json`. In ESLint, spread `configs.testing` into your config array. The rules apply to `*.test.*` files. Tests that run in a real browser skip the jsdom rules: `*.browser.test.*` files, `*.spec.*` files, which Playwright runs, and files in an `e2e` folder. Those keep `roadie/no-fixed-sleep`, and a `*.test.*` file among them keeps `roadie/no-cva-output-assertion` too. The [linting guide](https://ticketsolutionsptyltd.github.io/roadie/overview/linting/#testing) shows both setups.
