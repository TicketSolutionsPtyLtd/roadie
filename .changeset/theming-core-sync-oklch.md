---
'@oztix/roadie-core': minor
---

**Sync sRGB→OKLCH converter + unified bootstrap script + extended radius scale**

**New sync colour utilities in `@oztix/roadie-core/colors`:**

- `hexToOklch(hex)` — convert a hex string to `{ l, c, h }` using
  Björn Ottosson's reference sRGB→Oklab→OKLCH pipeline. Zero
  dependencies (the existing async helpers still use `colorjs.io`).
- `getOklchHueSync(hex)` / `getOklchChromaSync(hex)` — synchronous
  siblings of the existing async helpers. Match the async output to
  four decimal places across a 20-hex representative palette.
- `Oklch` type export.

These unblock pre-hydration accent bootstrap: the hot path that the
`ThemeProvider` accent effect uses (setting just `--accent-hue` and
`--accent-chroma`) no longer needs an async `colorjs.io` import, so
consumers can inject the accent style tag before the first paint.
The existing async `generateAccentScale` / `generateNeutralScale`
pipeline is unchanged — those still use `colorjs.io` for the full
14-step hex fallback output.

**New `getBootstrapScript` helper in `@oztix/roadie-core/theme`:**

```ts
import { getBootstrapScript } from '@oztix/roadie-core/theme'

const html = getBootstrapScript({
  followSystem: true,
  accentColor: collection?.themeColour // optional
})
```

Returns a single HTML string combining the theme script (dark-mode
flash prevention) and an optional accent style tag. Framework-agnostic
— drop it into `<head>` via `dangerouslySetInnerHTML`, Astro's
`set:html`, or a plain HTML template. When `accentColor` is omitted
or `null`, only the theme script is emitted. Invalid hex input throws
synchronously with a clear error message.

**Extended radius scale:**

Tailwind v4's default radius scale stops at `rounded-4xl` (2rem), so
`rounded-5xl` and beyond silently resolved to `0px`. Roadie now adds
three extended tiers via `@theme inline` in `tokens.css`:

- `--radius-5xl: 2.5rem` (40px) — hero cards, collection headers
- `--radius-6xl: 3rem` (48px) — feature banners
- `--radius-7xl: 3.5rem` (56px) — edge-to-edge promotional layouts

See the [shape foundation](/foundations/shape) page for usage
guidance and the new `foundations/theming` page for the full
dynamic-theming walkthrough.
