---
'roadie-skills': minor
---

`/roadie:audit` runs `@oztix/eslint-plugin-roadie` for the checks a lint rule makes, and reports its hits by rule ID. It installs the plugin and adds its recommended config when the app lacks them, which also brings arbitrary z-index and radius classes into the audit. The skill no longer greps for `dark:` variants (A4), bare Phosphor names (C2), icon `size` props (C3), or hex colours in class strings (part of A3). C4 now checks only where `fill` and `duotone` belong, since the lint rule makes every icon bold, fill, or duotone.

H6 now finds a hand-built calendar tile by its shape, a short month stacked over a day, so it flags sentence-case tiles as well as uppercase ones, to match `CalendarTile`'s sentence-case month.
