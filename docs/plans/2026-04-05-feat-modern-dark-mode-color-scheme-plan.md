---
title: Modern dark mode with CSS color-scheme
type: feat
status: active
date: 2026-04-05
---

# Modern Dark Mode with CSS `color-scheme`

## Overview

Add CSS `color-scheme` support to Roadie so native browser UI (scrollbars, form controls, system colors) matches the active theme. Default to light mode. Extend ThemeProvider to be the single API for dark mode toggling, with an opt-in `followSystem` option for consumers who want to respect the user's OS preference.

## Problem Statement / Motivation

Currently, toggling `.dark` on `<html>` swaps all custom design tokens, but native browser-rendered elements (scrollbars, unstyled form fallbacks, date pickers, system dialog backgrounds) stay in their default light appearance. This creates a visual mismatch in dark mode.

ThemeProvider declares a `defaultDark` prop that is never used — dark mode toggling lives in a standalone component with no shared API. There is also no way for consumers to opt in to following the user's OS preference in a controlled way.

## Proposed Solution

A minimal, additive approach — keep the existing `.dark` class token-swapping architecture and layer `color-scheme` on top.

### What changes

1. **CSS: Add `color-scheme` declarations** — `reset.css`
2. **Meta tag: Add `<meta name="color-scheme" content="light">`** — recommended for consumers, added to docs
3. **ThemeProvider: Manage dark mode state** — extend existing provider
4. **Export `getThemeScript()` helper** — SSR flash prevention for consumers
5. **Docs: Update inline script and toggle** — use `followSystem` option, consume ThemeProvider

### What stays the same

- `.dark` class on `<html>` as the toggle mechanism
- All token-swapping in `tokens.css`, `intents.css`, `elevation.css`, `interactions.css`
- No `dark:` Tailwind variants — tokens handle everything
- OKLCH + hex fallback layering
- `-light-` token layer for dark-mode-immune colors

### What we explicitly do NOT adopt

- **`light-dark()` CSS function** — only 87% global browser support (caniuse). Safari pre-17.5 (iOS 16) still present in Australian market. Does not meet the 99% AU threshold. Also conflicts with our manual `.dark` toggle approach since it requires `color-scheme: light dark` which lets the OS drive the scheme.

## Technical Approach

### Phase 1: CSS Foundation (packages/core)

**File: `packages/core/src/css/reset.css`**

Add `color-scheme` declarations inside the existing `@layer base` block:

```css
:root {
  color-scheme: light;
}

.dark {
  color-scheme: dark;
}

@media print {
  :root {
    color-scheme: light !important;
  }
}
```

**Why `reset.css`?** `color-scheme` is a foundational browser behavior setting, not a design token. It belongs alongside the reset, not in `tokens.css`.

**Why `@layer base`?** Keeps it overridable by consumers if needed, while ensuring it applies before component styles.

**Why print override?** Users expect light output when printing, regardless of screen theme.

**Browser support:** `color-scheme` has 97% global support (Chrome 81+, Safari 13+, Firefox 96+, Edge 81+). No fallback needed — older browsers simply ignore it and get the same behavior as today.

### Phase 2: ThemeProvider Extension (packages/components)

**File: `packages/components/src/providers/ThemeProvider.tsx`**

Extend ThemeProvider to manage dark mode alongside accent color:

**Props:**

```tsx
interface ThemeProviderProps {
  children: React.ReactNode
  defaultAccentColor?: string
  defaultDark?: boolean // initial dark mode state (default: false)
  followSystem?: boolean // respect prefers-color-scheme (default: false)
}
```

**State priority chain:** `localStorage('theme')` > `followSystem` (OS preference) > `defaultDark` prop > `false` (light)

When `followSystem` is `true` and there is no localStorage value, check `window.matchMedia('(prefers-color-scheme: dark)')` and listen for changes. When `followSystem` is `false` (default), ignore OS preference entirely.

**Context shape (rename to `ThemeContext`):**

```tsx
interface ThemeContextValue {
  accentColor: string | null
  setAccentColor: (color: string) => void
  scaleResult: ScaleResult | null
  isDark: boolean
  setDark: (dark: boolean) => void
}
```

**Mount behavior:** On mount, read `document.documentElement.classList.contains('dark')` to sync with any inline script that already ran. This avoids fighting the flash-prevention script.

**`followSystem` listener:** When `followSystem` is `true`, add a `matchMedia` change listener so the theme updates if the user changes their OS preference while the page is open. Only applies when the user hasn't explicitly toggled (no localStorage value). Clean up the listener on unmount.

**Toggle behavior:** When `setDark` is called:

1. Toggle `.dark` class on `document.documentElement`
2. Set `document.documentElement.style.colorScheme` to `'dark'` or `'light'`
3. Persist to `localStorage.setItem('theme', isDark ? 'dark' : 'light')`

Once the user explicitly toggles, their choice is persisted and takes precedence over OS preference even when `followSystem` is `true`.

**SSR safety:** All DOM access gated behind `useEffect` / client-side checks, same pattern as existing accent color logic.

**Rename hook:** `useAccent()` -> `useTheme()` (re-export `useAccent` as deprecated alias for backwards compat during migration).

### Phase 3: Flash-Prevention Helper (packages/components)

**File: `packages/components/src/providers/ThemeProvider.tsx`** (same file, new export)

Export a `getThemeScript()` function alongside existing `getAccentStyleTag()`:

```tsx
export function getThemeScript(options?: {
  defaultDark?: boolean
  followSystem?: boolean
}): string {
  const defaultTheme = options?.defaultDark ? 'dark' : 'light'
  const systemFallback = options?.followSystem
    ? `window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'`
    : `'${defaultTheme}'`
  return `
    try {
      var t = localStorage.getItem('theme') || ${systemFallback};
      var d = document.documentElement;
      d.classList.toggle('dark', t === 'dark');
      d.style.colorScheme = t === 'dark' ? 'dark' : 'light';
    } catch(e) {}
  `
}
```

**Why set `style.colorScheme` in the script?** Belt-and-suspenders. The CSS rule `.dark { color-scheme: dark }` handles it after CSS parses, but on slow connections there is a gap between script execution and CSS parse where scrollbars could flash in the wrong scheme.

**Usage in Next.js (React):**

```tsx
<head>
  <meta name='color-scheme' content='light' />
  <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
</head>
```

**Usage in Vue / Nuxt / any framework:**

`getThemeScript()` returns a plain string — no React dependency. It can be injected into any HTML `<head>`:

```html
<!-- Vue/Nuxt: useHead() or direct template -->
<script>
  {
    getThemeScript({ followSystem: true })
  }
</script>

<!-- Plain HTML / any SSR framework -->
<script>
  // paste the output of getThemeScript() directly
</script>
```

For runtime toggling without React's ThemeProvider, the mechanism is simple vanilla JS:

```js
function setDark(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}
```

Any framework can call this. The CSS tokens respond to the `.dark` class automatically — no React context needed.

### Phase 4: Docs Site Updates

**File: `docs/src/app/layout.tsx`**

1. Add `<meta name="color-scheme" content="light" />` to `<head>`
2. Replace the inline dark mode script with `getThemeScript({ followSystem: true })` (or inline its output)
3. The docs site opts in to `followSystem` — respects the user's OS preference when no explicit choice is stored in localStorage

**File: `docs/src/components/Navigation.tsx`**

Update `ThemeToggle` to consume `useTheme()` from ThemeProvider instead of managing its own state:

```tsx
function ThemeToggle() {
  const { isDark, setDark } = useTheme()
  return (
    <button
      onClick={() => setDark(!isDark)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon weight='bold' /> : <MoonIcon weight='bold' />}
    </button>
  )
}
```

**File: `docs/src/app/layout.tsx`** — wrap app content in `<ThemeProvider>` if not already.

## System-Wide Impact

- **Interaction graph:** `setDark()` -> classList toggle + style.colorScheme + localStorage write. No callbacks, observers, or side effects beyond DOM mutation and storage.
- **Error propagation:** localStorage failure is caught silently (try/catch in inline script and provider). Falls back to `defaultDark` or light.
- **State lifecycle risks:** Minimal. The only persisted state is `localStorage('theme')`. If corrupted, defaults to light. No orphaned state possible.
- **API surface parity:** `getAccentStyleTag()` does not need updating — `color-scheme` is in compiled CSS. `getThemeScript()` is the new parallel export.

## Acceptance Criteria

### Functional

- [x] `:root` has `color-scheme: light` by default
- [x] `.dark` selector sets `color-scheme: dark`
- [ ] Scrollbars render dark in dark mode, light in light mode
- [ ] Native form controls (if any unstyled) match the active theme
- [x] Default is light when `followSystem` is `false` (or omitted)
- [x] `followSystem: true` respects `prefers-color-scheme` when no localStorage value
- [x] `followSystem` listener updates live when OS preference changes mid-session
- [x] Explicit user toggle persists to localStorage and overrides `followSystem`
- [x] `ThemeProvider` exposes `isDark` and `setDark` via `useTheme()` hook
- [x] `getThemeScript()` exported via `@oztix/roadie-components/server` for SSR, supports `followSystem` option
- [x] Docs site uses `getThemeScript({ followSystem: true })`
- [x] Theme preference persists in localStorage across page loads
- [x] Print always uses light color scheme
- [x] `<meta name="color-scheme" content="light">` in docs `<head>`

### Non-Functional

- [ ] No flash of wrong theme on page load (light or dark)
- [x] No hydration mismatch warnings in React
- [x] Works in Chrome 81+, Safari 13+, Firefox 96+, Edge 81+ (covers 99% AU)
- [x] Zero bundle size impact on consumers who don't use dark mode (CSS-only, tree-shakeable JS)
- [x] `useAccent()` still works as deprecated alias

## Dependencies & Risks

**Low risk:** All changes are additive. The `.dark` token system is untouched. `color-scheme` is ignored by browsers that don't support it (same behavior as today).

**No behavioral change for docs site:** The docs site will continue to respect OS preference via `followSystem: true`. Consumer apps default to light-only unless they opt in.

**Migration for consumers:** Consumers using the docs site's inline script pattern directly should switch to `getThemeScript()` for a cleaner API. Pass `{ followSystem: true }` to keep OS preference detection.

## Implementation Order

1. `reset.css` — add `color-scheme` declarations (standalone, zero dependencies)
2. `ThemeProvider.tsx` — extend with dark mode + export `getThemeScript()`
3. `docs/layout.tsx` — meta tag + updated inline script
4. `docs/Navigation.tsx` — consume `useTheme()` instead of local state
5. Update documentation (see Phase 5)
6. Test across Chrome, Safari, Firefox on macOS and iOS

### Phase 5: Documentation Updates

**File: `docs/src/app/migration/page.tsx`**

Add a section covering:

- `color-scheme` now set automatically via `reset.css` — no action needed if already importing `@oztix/roadie-core/css`
- `useAccent()` deprecated in favour of `useTheme()` — still works, but update when convenient
- New `getThemeScript()` export replaces hand-rolled inline scripts
- `followSystem` option for consumers who want OS preference detection

**File: `docs/src/app/foundations/colors/page.tsx`**

Add a "Dark Mode Setup" section covering:

- How dark mode works (`.dark` class on `<html>`, tokens swap automatically)
- React setup: `<ThemeProvider followSystem>` + `useTheme()` for toggle
- Vue / vanilla JS setup: `getThemeScript()` + the `setDark()` vanilla JS snippet
- Flash prevention: `<meta name="color-scheme" content="light">` + inline script in `<head>`
- Note that `color-scheme` ensures scrollbars and native form controls match the theme

## Sources & References

- [MDN: color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) — 96.94% global support
- [MDN: light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) — 87.46% global, NOT adopted
- [Tailwind v4: color-scheme utilities](https://tailwindcss.com/docs/color-scheme)
- [Tailwind v4: dark mode](https://tailwindcss.com/docs/dark-mode)
- [web.dev: color-scheme](https://web.dev/articles/color-scheme) — meta tag performance guidance
- Existing architecture: `packages/core/src/css/tokens.css`, `reset.css`, `intents.css`, `elevation.css`
- ThemeProvider: `packages/components/src/providers/ThemeProvider.tsx`
- Docs toggle: `docs/src/components/Navigation.tsx`, `docs/src/app/layout.tsx`
