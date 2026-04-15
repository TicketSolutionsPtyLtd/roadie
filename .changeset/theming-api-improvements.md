---
'@oztix/roadie-components': minor
---

**Theming API improvements — controlled accent, validation, and pre-hydration bootstrap**

Add a new declarative theming surface on `ThemeProvider` plus the pieces
needed to eliminate the "flash of default accent" on static-export apps.

**New exports from `@oztix/roadie-components`:**

- `DEFAULT_ACCENT_COLOR` — the Oztix blue default, previously
  module-local.
- `InvalidColorError` / `isValidHexColor` — validation primitives.
  Consumers can guard untrusted hex at the fetch boundary instead of
  reinventing a zod schema.
- `getAccentStyleTagSync(hex)` — synchronous sibling of
  `getAccentStyleTag`. Returns a full `<style>` tag with
  `--accent-hue` and `--accent-chroma`, ready for framework-agnostic
  `<head>` injection. Uses the new sync sRGB→OKLCH converter in core.
- `getAccentStyleSync(hex)` — returns just the inner CSS body
  (`:root{--accent-hue:...;--accent-chroma:...}`), for React consumers
  that want to wrap it in a real `<style>` element via
  `dangerouslySetInnerHTML`.
- `getBootstrapScript(opts)` — re-exported from `@oztix/roadie-core`.
  Composes `getThemeScript` + an optional accent style tag into one
  head injection for apps that want to do the whole bootstrap in one
  line.

**Controlled `accentColor` prop on `ThemeProvider`:**

```tsx
<ThemeProvider accentColor={collection?.themeColour ?? null}>
  {children}
</ThemeProvider>
```

- Pass `undefined` (or omit the prop) to stay uncontrolled — the old
  `defaultAccentColor`-seeded behaviour is unchanged.
- Pass a hex string to take control: the prop overrides internal state
  on every render, imperative `setAccentColor` calls become no-ops with
  a dev warning, and there's no effect sync or cleanup to wire up.
- Pass `null` to opt into controlled mode while falling back to
  `defaultAccentColor` (ideal for `collection?.themeColour ?? null`).
- Invalid hex input in a controlled prop logs a dev warning and falls
  back to the default — the provider never renders with a broken
  theme.

**`setAccentColor` now throws synchronously** with `InvalidColorError`
when the argument isn't a valid hex. Previously the call "succeeded"
and threw inside the async accent effect with no handler path. If your
app validates at the boundary (or uses the new `isValidHexColor`
helper), there's nothing to change.

**Why this matters.** Consumer apps that theme from async data
(per-tenant branding, promoter-coloured collection pages, feature
flags) can now drop their bespoke effect-based accent sync, their
hex validator, and their hardcoded default constant. The imperative
API remains for simple cases like in-app colour pickers.
