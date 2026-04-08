---
'@oztix/roadie-core': major
'@oztix/roadie-components': major
---

Migrate design system from PandaCSS to Tailwind CSS v4 + Base UI

**Breaking changes:**

- Replace PandaCSS with Tailwind CSS v4 — all `css()`, `styled()`, `sva()`, and `cva()` (PandaCSS) APIs removed
- Replace Ark UI with Base UI for interactive component primitives
- Remove `View`, `Container`, `Text`, and `Heading` components — use raw HTML elements with utility classes
- Remove `useAccent()` hook — replaced by `useTheme()`
- Remove `useColorMode()` hook — replaced by `useTheme()` with `isDark`/`setDark`
- Rename `colorPalette` prop to `intent` (`information` -> `info`, `primary` -> `brand`)
- Rename `appearance` prop to `emphasis` across all components
- Rename emphasis level `default` to `normal` (scale: strong -> normal -> subtle -> subtler)
- Components no longer set a default intent — they inherit from CSS cascade context
- Default Tailwind color utilities disabled (`--color-*: initial`) — use semantic colors (`bg-normal`, `text-subtle`, `border-normal`)
- `getAccentStyleTag()` is now async (lazy-loads colorjs.io)
- Dark mode changed from `data-color-mode="dark"` to `className="dark"` with CSS `color-scheme`
- Icons migrated from Lucide to Phosphor (`@phosphor-icons/react`, `weight="bold"`)

**New features:**

- CSS-native OKLCH color system with 7 intents x 14-step scales
- Intent/emphasis/semantic-color utility system via Tailwind `@utility` directives
- Intent-tinted elevation shadows and rim-light scale
- Fluid typography via `clamp()` for text-lg and above
- Motion tokens (duration, easing, keyframes) with `prefers-reduced-motion` reset
- `is-interactive` and `is-interactive-field` interaction utilities
- Flash-free dark mode SSR via `getThemeScript()`
- 19 new components: Prose, Badge, Card, Input, Textarea, Field, Label, Select, Combobox, Autocomplete, RadioGroup, Fieldset, Accordion, Breadcrumb, Separator, Steps, LinkButton, Indicator, Marquee
- Field as universal form control wrapper with context inheritance
- Sub-component API pattern for Select and Combobox
- ThemeProvider with `followSystem`, `defaultDark`, `setDark`, localStorage persistence
- Vue integration support (tokens + utility classes only)
