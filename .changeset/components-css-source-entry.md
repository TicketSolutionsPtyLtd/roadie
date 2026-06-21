---
'@oztix/roadie-components': minor
'@oztix/roadie-widgets': patch
---

Add a `@oztix/roadie-components/css` Tailwind source-registration entry.

Tailwind v4 ignores `node_modules` by default, so consumers previously had to
hand-write `@source "../../node_modules/@oztix/roadie-components/dist"` (a path
that breaks when `globals.css` moves). Now import one line instead — the package
ships its own `@source` relative to itself:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
```

The `@oztix/roadie-widgets/css` entry now `@import`s
`@oztix/roadie-components/css`, since the React widget skins render Roadie
components (Button, Popover, …) whose class strings live in the components dist.
A single `@import '@oztix/roadie-widgets/css'` therefore covers everything a
widget renders — no separate components registration needed when using widgets.
