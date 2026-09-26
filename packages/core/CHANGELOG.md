# @oztix/roadie-core

## 2.10.0

### Minor Changes

- 97854ae: Add `Collapsible`, a single panel that a trigger shows and hides.
  `Collapsible.Trigger` shows a trailing caret that turns when open (`showCaret={false}`
  hides it) and renders onto a Roadie `Button` through `render`.
  `Collapsible.Panel` passes `keepMounted` and `hiddenUntilFound` through.
  `Collapsible.Text`, placed inside a `Collapsible`, clamps a paragraph to `lines` (3 by default) and ends the
  last line with an inline "…more" that fades the text behind it. The trigger shows
  only when the text overflows; `lessLabel={null}` makes it expand only. The
  `Collapsible` root now owns the open state and shares it with its parts.

  `is-disclosure-animated` now also animates Base UI panels that aren't `<details>`,
  by height from `--collapsible-panel-height`.

- 200dbed: Add dashboard support. `@oztix/roadie-core/dashboard` describes a dashboard as
  JSON, with a Zod schema, a JSON Schema export for tool inputs, and
  `validateDashboard`, which reports every problem with its path, including rows
  that leave gaps, copy that will truncate, and unknown keys. A zod-free
  `@oztix/roadie-core/dashboard-layout` subpath exposes the card sizes, spans,
  tracks, `findRowGaps` and `COPY_LIMITS` for UI code that must not load Zod.
  `@oztix/roadie-core/dataviz` gains `formatValue` and delta helpers in the
  house number formats, and `chartHex` now returns chrome colours for static
  renderers. Chart ink now follows nested `.dark` and `intent-*` sections, the
  highlight's hex fallback uses the default accent hue, and chart marks get
  texture patterns under forced colours and print.
- b4ca530: Add data visualisation colours. Charts get `--chart-1` to `--chart-8` for
  series, `--chart-heat-*` for amounts, `--chart-diverge-*` for ahead of or
  behind a benchmark, `--chart-status-*` for meaning, and `--chart-highlight`,
  which follows `--accent-hue`. Each comes with `bg-`, `fill-`, `stroke-` and
  `text-chart-*` utilities, in light and dark. Canvas, SVG and PDF renderers can
  read the same values as hex from `@oztix/roadie-core/dataviz`, with the greys
  tinted by the accent hue as the CSS ones are, and
  `chartColorVar(i)` gives a CSS variable when the slot is dynamic. The palette
  is checked for colour-blind separation in CI.
- 6ec114f: Add `Progress`, a bar for a task underway.
  `<Progress value={40} label='Uploading' />` renders the label, the value and
  the track; `valueText` swaps the percentage for text such as "120 of 400" and
  reads it to screen readers. Pass `value={null}` while the length is unknown
  and the bar sweeps across the track. The parts (`Label`, `Value`, `Track`,
  `Indicator`) compose for custom layouts. The fill is the accent by default,
  like `Meter`, and takes the intent when you pass `intent`, such as `success`
  or `danger` once a task has ended. Core gains the `animate-indeterminate`
  utility behind the sweep, which holds a still, soft bar under reduced motion.
- b67cf46: Add `text-on-strong` (`--intent-text-on-strong`), the label colour for strong
  fills. Each intent takes whichever text colour reads better on its fill, and
  reaches APCA Lc 60 in both modes, at rest, on hover and when pressed, in
  browsers that support `color-mix()`. `emphasis-strong`, CalendarTile's strong
  band, and the strong Tabs and ToggleGroup pills use it.

  - White on brand, accent, info and danger, in both modes. Danger's strong fill
    moves one step deeper, to step 10. In dark mode, hover and press darken the
    fill to steps 8 and 7.
  - Dark text on success, warning and brand-secondary: step 13 in light mode, step
    0 in dark mode. Success and brand-secondary lift their fill 10% toward white.
    Hover and press lighten the fill further in both modes.

  `text-inverted` is unchanged: it's still the page's text colour flipped, and
  pairs with `bg-inverted`. To migrate, use `text-on-strong` for labels on
  `bg-strong` or `emphasis-strong` fills where you used `text-inverted`.

  A custom accent keeps its white text too. The new `getAccentChromaSync(hex)`
  caps an accent's chroma to what sRGB can show at step 9, because browsers clip
  a more saturated fill and the clip makes it lighter. `getBootstrapScript` and
  `generateAccentScale`, which writes the hex fallback scale, now use it, so a
  saturated green or cyan accent no longer renders too light.

  Browsers that draw `oklch()` but not `color-mix()` (Safari 15.4 to 16.1) get
  step 9 for the lifted strong fills and steps 7 and 6 for hover and press, so
  the fills stay solid there. Success and brand-secondary read at about Lc 57 to
  58 at rest in those browsers.

  `generateAccentScale` now reports `fgOnStrong` by APCA, so it matches
  `text-on-strong`: `white` for Oztix blue, where it used to say `black`. It also
  no longer lifts a grey accent to chroma 0.1, so the hex fallback matches the
  CSS.

  White labels on brand, accent, info and danger are 3.2 to 3.5:1 by WCAG 2. That
  meets 3:1, not the 4.5:1 WCAG 2 asks of normal-size text. The accessibility
  page now names strong-fill labels as the APCA exception.

  Hover and press use the new `--intent-bg-strong-hover` and
  `--intent-bg-strong-active` tokens. Neutral is unchanged.

  This is a minor bump because it adds a utility and tokens, and some strong fills
  and their label colours change.

- 47c7147: Add `Toast`, a brief message that confirms an action or reports its result.
  Mount `Toast.Provider` with a `Toast.Viewport` once at the app root, then call
  `useToastManager().add({ title, description, intent, actionProps })` from any
  component, or `createToastManager()` from outside React. `intent` (`success`,
  `danger`, `warning` or `info`) colours the toast and leads it with a matching
  icon, `actionProps` adds a small button such as Undo or Retry, and `promise`
  shows a spinner until the work settles. A thin `Toast.Progress` bar along the
  bottom of timed toasts shows how long they have left, pausing whenever their
  timer pauses (hover, focus, a background window). `Toast.Viewport` takes a `position`
  (`bottom-end` by default, `bottom-center`, `top-end` or `top-center`); small
  screens always span the chosen edge. Set `--toast-viewport-offset-bottom` (or
  `-top`) to clear fixed UI such as a checkout bar. Toasts fan out on hover or
  focus and swipe away towards their edge. Core adds the `motion-toast` utility
  that stacks and animates them from either edge: toasts enter, restack and
  snap back on a spring and leave quickly. Core also adds `--ease-spring-lively`,
  a spring with a visible bounce (about 9% overshoot) for transforms that should
  catch the eye.

  The `@base-ui/react` peer range rises to `^1.8.0`. Toast relies on 1.8 for
  `update(id, previous => …)` and for timers that keep their remaining time
  across repeated pauses, which the progress bar follows.

### Patch Changes

- f898797: Emphasis and field hover states now only apply on devices that can hover. On a
  touch screen the last button tapped kept its hover colour and lift, so it looked
  stuck or half disabled until something else was tapped. A tapped raised field
  also keeps its rim light, and a translucent field stays see-through. Focus and
  press states are unchanged.

## 2.9.0

### Minor Changes

- dba660b: Add `is-interactive-within`, for a surface whose main link sits inside it,
  such as a card that also holds other actions. Mark the link with
  `data-interactive-target`. Its overlay covers the surface, so a click anywhere
  follows it, and other links, buttons and fields sit above it and stay
  clickable. The surface takes the same hover, press and focus states as
  `is-interactive` while its main link is hovered, pressed or focused, from the
  same emphasis rules, so the values live in one place. It does nothing until a
  target is present.

  `is-interactive` now reads its transition list from `--interactive-transition`,
  which both utilities share.

- dba660b: Add `emphasis` to `Drawer` and `Dialog`: how much the overlay takes over the
  page behind it. `normal` dims and blurs the page, `subtle` tints it and leaves
  it readable, and `subtler` leaves it clear while a click outside still
  dismisses. A small (`size='sm'`) top or bottom drawer defaults to `subtle`,
  because it peeks over its page; every other drawer and every dialog defaults
  to `normal`.

  Core adds `emphasis-overlay-subtle`, and `emphasis-overlay` now drops its blur
  under `prefers-reduced-transparency` and carries the `-webkit-` prefix.

### Patch Changes

- dba660b: Top and bottom drawers now run edge to edge on a phone and, from `sm` up, stop
  at `max-w-xl`, centred, floating `--spacing(2)` off their edge with every
  corner rounded: the same shape as the cart drawer. Remove any width, margin or
  radius classes an app added to get this.

  Every drawer now rounds at `rounded-4xl`, the new Sheet tier on the Shape
  foundation, whichever side it comes from. The edge it's attached to stays
  square.

  `Drawer.Body` now scrolls in `ScrollArea`, so drawers use Roadie's scrollbar.
  It is still Base UI's drawer content, so a drag in a scrolled body scrolls it
  rather than dismissing. A `className` on it still styles the content, as
  before.

  Core's `motion-drawer` reads `--drawer-float`, so a surface held off its edge
  slides fully clear.

## 2.8.0

### Minor Changes

- f3990bd: Add `animate-pop-tap` — a 200ms tap response, where `animate-pop` at 600ms reads
  as a notification.

  Add the `navigator-expanded` variant, which Navigator's expanded vertical
  navigation is styled with, plus `@oztix/roadie-core/navigator`.

  `@oztix/roadie-core/navigator` also exports `getNavigatorExpandedScript`, an
  optional head script that lets a static site paint a persisted expanded vertical
  navigation before hydration, with the cookie name it reads and a serializer to
  write it.

  Add `is-translucent`, which lets content show through a raised or floating
  surface's fill under a backdrop blur. It pairs with `emphasis-raised`,
  `emphasis-floating` or `bg-raised`, keeps their rim light and shadow, and falls
  back to the solid fill without `backdrop-filter` support or under
  `prefers-reduced-transparency: reduce`. On an `is-interactive-field`, the
  field's hover, focus and invalid fills still win.

- 65ba926: Add `Drawer`, a surface that slides in from any edge and swipes away, built on
  Base UI's drawer primitive. Core gains the `motion-drawer` utility, which drives
  a drawer's edge transition and tracks Base UI's live swipe offset.
- 8c2ca73: One rule for the two motion prefixes: `animate-*` plays now, once, as a
  keyframe animation; `motion-*` is state-driven enter/exit only, a transition
  on Base UI's `data-starting-style` / `data-ending-style`.

  Renamed the keyframe mount animations to match:

  - `motion-fade-in` → `animate-fade-in`
  - `motion-scale-in` → `animate-scale-in`
  - `motion-pop-in` → `animate-pop-in`

  `motion-fade-out` and `motion-scale-out` are deprecated with no replacement —
  use `motion-scale` or `motion-slide` for the exit instead.

  All five old names remain as deprecated aliases until v3.

- 5363c7a: Add `Skeleton`, a placeholder that holds the space content will occupy while it
  loads. One component with a `shape` variant: `text` is a line at the inherited
  line height, `block` is a panel, `circle` is an avatar. Width and height come
  from Tailwind utilities, so a paragraph or a list row is several Skeletons in a
  grid. The root is `aria-hidden` and carries `data-slot='skeleton'`.

  Core adds the `--duration-ambient` (1800ms) and `--duration-sweep` (2400ms)
  tokens, the `--sheen-shade` and `--sheen-highlight` colours, the
  `animate-pulse-subtle` utility, and `animate-shimmer`, which crosses a surface
  with a highlight over that pulse. The highlight is anchored to the viewport, so
  every element wearing the class shares one sweep whatever its size, and it is
  the lighter of the two tones in both themes. Under `prefers-reduced-motion` the
  highlight is dropped and the pulse resolves to a static tint.

### Patch Changes

- f3990bd: `roadie.compiled.css` now ships `motion-scale`, `motion-slide`, `animate-shake`, `animate-nudge` and `animate-pop`, which the precompiled sheet had been dropping.
- 4deb856: - Named `duration-*` utilities set `--tw-duration`, so a variant-scoped `transition-[…]` keeps their duration, and they now ship in `roadie.compiled.css`.
  - `cn` merges `emphasis-field` with the other emphasis presets.

## 2.7.0

### Minor Changes

- 8c8b666: Refine the shadow scale so raised, floating and sunken surfaces read as
  detailed rather than heavy, and give text fields a cleaner edge.

  Each `shadow-*` level is now a hairline ring for the edge plus a stack of
  layers whose offset and blur double; higher levels add a layer and lower each
  layer's opacity instead of darkening. Light-mode shadows are a shade of the
  intent hue rather than near-black. Inset shadows drop their ring and their
  heavy dark-mode black, and gain a faint lower lip in dark mode so they still
  read as recessed.

  The `shadow-*` and `inset-shadow-*` utilities now follow dark mode and intent
  tinting. Tailwind had been compiling their light values in, so they ignored
  both — only the emphasis presets did. Token and utility names are unchanged.

  New `emphasis-field` preset for text fields: a sunken fill, one translucent
  border that takes the fill's tint, and a single inset line. It is plain CSS, so
  server-rendered markup gets the same look with
  `class="emphasis-field is-interactive-field"`. `Input`, `Textarea`, and the
  `Combobox` and `Autocomplete` input groups use it in place of
  `emphasis-sunken border border-subtle`.

  `is-interactive-field` and `is-interactive-field-group` hover now steps to
  `neutral-3` in light mode — it previously matched the resting fill — and focus
  uses `accent-1` in dark mode so a focused field stays close to its resting
  depth.

  The `Select` trigger drops its solid `border-normal`: the raised shadow's
  hairline now draws its edge, and a solid border beside it read as a double
  outline. Its open state uses the same fill as a focused field.
  While a field state colours its border, `is-interactive-field` switches off
  the raised rim light, which otherwise showed as a white gap inside the border.

## 2.6.0

### Minor Changes

- c989b7e: Add a date and time standard: a formatting module and four components.

  `@oztix/roadie-core/datetime` is a new subpath export. It turns an instant into
  text and is the single place dates are spelled. Every call takes an explicit
  `timeZone`, with no browser fallback, because an event time rendered in the
  reader's zone is silently wrong for anyone not standing at the venue.

  `dateStyle` and `timeStyle` are two names for one ladder, `full` / `long` /
  `medium` / `short` / `iso` and `long` / `medium` / `short` / `numeric`, with
  presets for each step. Ranges join with the word `to` rather than a dash, which
  screen readers skip. The meridiem closes up against the digits, so times read
  `7:30pm`.

  Alongside the presets: ranges, durations, countdowns, relative time, and
  machine readable output. `formatMachine` carries the zone's offset so a value
  identifies an instant; `formatIso` deliberately omits it, for export columns
  read as local wall-clock. Instants may be a `Date` or anything carrying
  `epochMilliseconds`, and durations may be milliseconds, an ISO 8601 string, or
  the field object `Temporal.Duration` exposes, so Temporal values work today.

  `DateTime`, `Duration` and `Countdown` are new components. They render a `time`
  element and set its machine readable value, which is the part that is easy to
  get wrong and wrong silently. `CalendarTile` is the exception: it abbreviates
  too hard to be an accessible name, so by default it is an `aria-hidden` `div`
  and the date line beside it owns the `time`. Pass `dateTime` and it becomes one
  itself, which is only right where the tile is the sole date in its region. `Countdown` animates its digits
  with `@number-flow/react`, which components now depends on directly rather than
  asking consumers to install: the root barrel imports it, and a bundler resolves
  every import before it tree shakes, so a peer would break `import { Button }`
  for anyone who had not added it. `CalendarTile` ships a matching `calendar-tile`
  CSS utility for templates that cannot run React.

  **Four visible changes to the shipped cart widget.** Day headers no longer mix
  an abbreviated weekday with a full month, so `Fri, 27 November 2026` becomes
  `Fri 27 Nov 2026`. Time and date ranges join with the word `to` rather than an
  en dash. Seat runs join with a hyphen rather than an en dash, matching how
  number ranges are already written elsewhere, so `A1–4` becomes `A1-4`. And a
  time whose timezone cannot be resolved now renders nothing rather than falling
  back to the browser's own clock, because a plausible time in the wrong zone is
  worse than no time at all.

  Rebuilds the Intermission faces so `tnum` reaches every digit. The digits 1, 4,
  6 and 9 were left proportional, so any column of numbers drifted as values
  changed. The faces are served from new CDN URLs.

## 2.5.0

### Minor Changes

- 5d05bd1: - **New `Image` component** (`@oztix/roadie-components`) — a size-aware `<img>`
  wrapper. Pass `width` and it requests a right-sized WebP from the Oztix CDN's
  ImageSharp.Web proxy plus a 1x/2x `srcSet`, cutting download bytes and
  decoded-bitmap memory (the Safari-mobile crash class). Non-Oztix URLs, and
  calls without a `width`, pass through as a plain `<img>`. `alt` is required.
  Supports `widths`, `sizes` (when set, builds a responsive small→2x `srcSet`
  ladder so smaller screens download smaller files — fixed-size images without
  `sizes` get 1x/2x), `height` (layout reservation + `aspect-ratio`, and sent to
  the proxy to crop to a fixed box — scaled across the `srcSet`), `priority`
  (eager + `fetchpriority="high"`), `format`, `quality`, `autotrim` (crop
  transparent padding server-side), a `params` escape hatch for any other
  ImageSharp.Web command (`rmode`, `ranchor`, `bgcolor`, …), `placeholder='blur'`
  (blur-up LQIP that fades in on load, auto-derived from the proxy with a
  `blurDataURL` override), `sources` (art direction — a `<picture>` with a
  different URL/crop per breakpoint), and `defer` (IntersectionObserver loading
  for off-screen carousel slides). Every image shows a subtle `bg-subtle` tint as a
  placeholder until it loads, then drops it (override with a semantic background
  utility).
  - **New `@oztix/roadie-core/image` entry point** — pure URL helpers
    `isOztixImageUrl`, `oztixImageAtWidth`, `oztixSrcSet`, and `oztixWidthLadder`
    (the responsive ladder the component uses), plus `OZTIX_IMAGE_HOSTS` /
    `OZTIX_DEVICE_WIDTHS`. For consumers building custom compositions (Vue,
    server-rendered `srcSet`) without the React component.
  - **`Card.Image` is now size-aware** — its inner `<img>` is an `<Image>`, so it
    inherits the full `Image` API (`width`/`height`/`widths`/`sizes`/`quality`/
    `autotrim`/`params`/`placeholder`/`sources`/`priority`/`defer`, the responsive
    ladder, and the `bg-subtle` placeholder).
    - **Behavior change:** card images now default to `loading='lazy'` (and
      `decoding='async'`), where the old bare `<img>` eager-loaded. Mark any
      above-the-fold card image `priority` to restore eager loading and protect
      LCP.
    - **Type narrowing:** `Card.Image` now requires `src` and `alt`, and
      `width`/`height` are `number`-only (previously `string | number` via
      `ImgHTMLAttributes`). Numeric call sites with alt text are unaffected.
  - **`render` on `Mark`, `Prose`, and `Carousel.Title`** — these still exposed the
    legacy polymorphic `as` prop. They now accept the standard Roadie `render`
    escape hatch (e.g. `<Mark render={<h2 />}>`, `<Prose render={<article />}>`,
    `<Carousel.Title render={<h3 />}>`), matching `Card`, `Breadcrumb.Link`, and
    `Carousel.TitleLink`. `as` is now `@deprecated` and will be removed in v3.0.0;
    it keeps working until then.
  - **`Breadcrumb` truncates instead of wrapping** — items no longer wrap. When the
    row runs out of room each item truncates with an ellipsis (`min-w-0` +
    `truncate` on the link/current text), while separators stay put (`shrink-0`).

## 2.4.0

### Minor Changes

- 5e3b922: `emphasis-overlay` now adapts to the active intent. Its scrim is built from the
  intent hue (`oklch(0.1 0.04 var(--intent-hue) / 0.55)`) instead of a fixed
  `rgba(0,0,0,0.5)`, so `intent-danger emphasis-overlay` reads as a dark red glass,
  `intent-accent` as a dark accent glass, etc. — while `neutral` stays a near-black
  scrim. The lightness is fixed so it remains a proper scrim in both light and dark
  themes (the intent scale flips between them).

## 2.3.0

### Minor Changes

- 82ae89b: Add generalized motion utilities to `motion.css`: `animate-nudge` and
  `animate-pop` (one-shot attention cues) plus `motion-pop-in` (fade + slide-up +
  scale entrance, pair with `origin-*`). Token-driven for duration/easing and
  covered by the global `prefers-reduced-motion` reset. These replace the
  cart-drawer widget's bespoke keyframes.
- 0ba959a: Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.
  - **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
  - **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
  - **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.

## 2.2.0

### Minor Changes

- 2a43e97: Add Dialog, Popover, and IconTile components.
  - **Dialog** / **Popover** — `@base-ui/react` compounds with `*.Content` shortcuts, `Header`/`Body`/`Footer`, and an `intent` variant on the popup. Dialog adds `sm`/`md`/`lg` sizes; Popover adds `Arrow`, `positionerProps` placement, and `openOnHover`.
  - **IconTile** — a tile that frames a single Phosphor icon, with `xs`–`3xl` sizes, `intent`/`emphasis` variants, and `square` (default) / `circle` shapes.
  - **core**: new `layering.css` z-index scale emitting named utilities (`z-overlay`, `z-modal`, `z-popover`, …), reusable `motion-scale` / `motion-slide` enter/exit utilities in `motion.css`, and a `--rim-light-edge` token in `elevation.css`.

## 2.1.0

### Minor Changes

- 225ce2c: **Sync sRGB→OKLCH converter + unified bootstrap script + extended radius scale**

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

## 2.0.1

### Patch Changes

- 4f929b8: Migrate build pipeline from tsup to tsdown (Rolldown). Internal build-tool
  change with no consumer-facing API differences — dist shape, exports map,
  and type declarations are unchanged.
  - Rolldown preserves `"use client"` directives on entries natively, so the
    post-build hook that previously re-inserted them is gone.
  - `build:css` now invokes the `tailwindcss` bin directly instead of
    `npx @tailwindcss/cli`, eliminating stray npm warnings during builds.
  - Adds `RefAttributes` to `RadioGroup.Root` and `RadioGroup.Item` prop
    types so they match the Select/Combobox/Autocomplete convention.
  - Adds `docs/contributing/BASE_UI.md` as the canonical authoring guide
    for new Base UI wrappers.

## 2.0.0

### Major Changes

- 0645262: Migrate design system from PandaCSS to Tailwind CSS v4 + Base UI

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

## 1.2.0

### Minor Changes

- d9a0534: Add essential components and design tokens for B2B website development (INNO-170)

  **New Components:**
  - Add Container component for responsive page-level layouts with max-width constraints
  - Add IconButton component for square, icon-only button variant
  - Add Mark component for semantic text highlighting with theme-aware styling
  - Add Highlight component for intelligent search result highlighting using Ark UI
  - Add SpotIllustration system with automated SVG-to-component pipeline and 12 initial illustrations

  **Design Token Enhancements:**
  - Add `brandSecondary` color palette to type system
  - Add `surface.highlight` tokens for all color palettes with hover/active states
  - Update `surface.strong` token colors for improved contrast

  **Font System:**
  - Rename from Inter Variable to Intermission (Oztix's customized version)
  - Enable OpenType features: case, ss03, cv01-cv05, cv08-cv11
  - Subset to Basic Latin (U+0020-007F) and typographic quotes (U+2018-201F) for optimized file size

  **Build System:**
  - Add automated SpotIllustration build pipeline with SVGO optimization and watch mode
  - Add chokidar and svgo dependencies for illustration tooling
  - Add tree-shakeable exports for spot illustrations

## 1.1.0

### Minor Changes

- 6e05fb8: Add color mode utilities and improve design tokens

  **New Features:**
  - Add vanilla JavaScript `colorMode` utilities for framework-agnostic color mode management
  - Export `useColorMode` hook separately from components for better tree-shaking
  - Add CSS custom properties and utilities for color mode tokens

  **Token Improvements:**
  - Align brand color names with lighting metaphor system (luminary, beacon, radiance, brilliance, spark)
  - Normalize all hex color codes to lowercase for consistency
  - Adjust semantic token `surface.strong` mappings for better contrast
  - Fix `Heading` component default `colorPalette` to use `neutral`

  **Developer Experience:**
  - Improve generated CSS token formatting to match Prettier rules
  - Optimize PandaCSS codegen to eliminate duplicate type generation
  - Add TypeScript incremental compilation support for faster builds

  **Documentation:**
  - Update docs to demonstrate color mode utilities usage
  - Add vanilla CSS tokens documentation and examples
  - Improve code preview component styling

## 1.0.0

### Major Changes

- 8481943: Upgrade to PandaCSS 1.4.3 and Ark UI with modernized component system

  **Breaking Changes:**
  - Upgraded PandaCSS from 0.48.1 to 1.4.3
  - Migrated from React Aria Components to Ark UI factory pattern
  - Button component now uses native HTML props: `disabled` instead of `isDisabled`, `onClick` instead of `onPress`
  - Removed `colors.solid.*` tokens (use `surface.strong` instead)
  - Renamed all `muted` emphasis levels to `subtler` (e.g., `fg.muted` → `fg.subtler`)
  - Changed primary font from Inter Variable to Intermission
  - Refined letter spacing token scale (values changed significantly)
  - Complete rewrite of Text, Heading, Button, and Code components to use Ark UI factory
  - New styled() API for components replacing previous implementation
  - Simplified View component implementation
  - Component props standardized across all components

  **New Features:**
  - All components now support `colorPalette` prop for flexible theming
  - Button component rewritten with `styled()` API and new `xs` size variant
  - Components modernized to use semantic `colorPalette.*` tokens
  - New standardized component API with consistent props across all components
  - Enhanced typings with HTMLStyledProps for comprehensive prop support
  - Updated Text, Heading, Button, and Code components with consistent styling system
  - View is now a PandaCSS pattern component
  - Improved recipe system with shared patterns and consistent APIs

  **Migration:**

  Update Button props:

  ```diff
  - <Button isDisabled onPress={handlePress}>
  + <Button disabled onClick={handlePress}>
  ```

  Replace removed tokens:

  ```diff
  - color: {colors.accent.solid.default}
  + color: {colors.accent.surface.strong}
  ```

  Update emphasis levels:

  ```diff
  - <Text emphasis="muted">
  + <Text emphasis="subtler">
  ```

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing
