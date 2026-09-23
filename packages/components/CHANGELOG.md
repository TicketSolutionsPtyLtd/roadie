# @oztix/roadie-components

## 2.14.0

### Minor Changes

- dba660b: `Card.Footer` reads `--card-footer-size` when it's a side column, with
  `direction='horizontal'` or a split `direction='auto'`. Set it once on a list
  so every card's side column, and a ticket's perforation along it, lines up
  whatever each footer holds. It's a minimum, so a wider footer still grows
  rather than overflowing, and a stacked footer ignores it.
- dba660b: Add `Card.Link`, the card's main link, for a card that also holds other
  actions. Wrap the title in it. It covers the card, so a click anywhere follows
  it, while other links and buttons in the card stay clickable above it. The card
  takes its hover, press and focus states from the link, for plain and ticket
  cards and every emphasis, so apps no longer restate them. Screen readers hear a
  short link named by its own text rather than the whole card. It routes `href`
  like every other Roadie link.

  On a ticket card in a browser without `corner-shape` (Firefox today), the
  footer's plain text doesn't follow the link; its own links still work.

- 7b36ba3: Add `variant='ticket'` to `Card`. It cuts a real notch into each side where the
  body meets `Card.Footer`, with a perforated line between them, and works with
  every emphasis.

  Add `direction` to `Card`. It lays out any card's parts: `vertical` (the
  default) stacks them, `horizontal` gives `Card.Footer` a column of its own
  beside the rest of the card, and `auto` stacks below 30rem and splits into two
  columns at or above it. On a ticket, the notches and the perforation follow
  whichever layout is in effect.

- dba660b: A `Drawer.Close` inside `Drawer.Header` now takes the top-left corner above
  the title, as far from the top edge as from the side, wherever it's written.
  Render it as a `normal` `IconButton` named "Close". The Drawer docs gain
  guidelines for naming a drawer, placing Close, when a drawer needs one, and
  keeping a second Close out of the footer.
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

- dba660b: `Drawer` sizes on the top and bottom are now fixed heights, so a sheet holds
  still while its content changes. Each is a share of the space the drawer can
  use. That space leaves out the far edge's safe area and a gap, like an iOS
  large sheet, and in a wider window the float off the near edge. `sm` is half
  of it, `md` three quarters and `lg` all of it. The new `fit` size follows the
  content up to all of it, and is the default for top and bottom drawers. Side
  drawers keep `md` as their default, and `fit` there sizes to the content's
  width up to the `lg` width. Remove any `h-*` class an app added to hold a
  drawer's height.
- dba660b: Add `emphasis` to `Drawer` and `Dialog`: how much the overlay takes over the
  page behind it. `normal` dims and blurs the page, `subtle` tints it and leaves
  it readable, and `subtler` leaves it clear while a click outside still
  dismisses. A small (`size='sm'`) top or bottom drawer defaults to `subtle`,
  because it peeks over its page; every other drawer and every dialog defaults
  to `normal`.

  Core adds `emphasis-overlay-subtle`, and `emphasis-overlay` now drops its blur
  under `prefers-reduced-transparency` and carries the `-webkit-` prefix.

- dba660b: `Pane.Body` now renders a `<div>` that fills the height the header leaves,
  and takes `className` and the other div props. A band or background on it
  reaches the pane's bottom edge, and a child with `grow` inside a
  `flex flex-col` body does too, so apps no longer need to restyle the pane's
  scroll content. A pane without a `Pane.Body` keeps its content height, as
  before.
- dba660b: An inspector `Pane` now moves its content into a bottom drawer when its column
  yields, so apps no longer write the content twice. Place a
  `Pane.InspectorTrigger` anywhere in the same `Navigator`: it shows only while
  the column has yielded and opens the drawer, which takes its name from the
  inspector's `aria-label` and keeps the page readable behind it.

  `reveal` on the inspector says its content should be seen. While the column
  shows, it already is; once the column has yielded, `reveal` opens the drawer.
  `onRevealChange` reports the trigger opening it and people dismissing it.

  The drawer is a fixed `lg` sheet, so filtering the content can't resize it
  under the user's thumb. `drawerSize` on the inspector picks another Drawer
  size.

  In the drawer, the inspector's own `Pane.Header` shows a Close in its top-left
  corner, 24px from the drawer's top and side, and casts the drawer's scroll
  shadow. Content without a `Pane.Header` gets a header holding just the Close.
  The drawer sets `--pane-surface` to its raised fill, so sticky chrome inside
  it mixes against the right colour.

  `pane-inspector-yielded:` also applies to the inspector's own content once it's
  in the drawer, so content can adapt to where it renders.

- dba660b: Add `size` to an inspector `Pane`: `sm` (14rem, the default), `md` (20rem) or
  `lg` (24rem). Each size has its own thresholds, so the stack's panes keep
  their minimum widths beside it and `pane-inspector-yielded:` flips at the
  right width. Use `size` rather than widening the column with a class, which
  leaves the thresholds assuming 14rem.
- dba660b: Add `measure` to `Pane`: `full` (the default), `narrow` (24rem, for forms),
  `readable` (65ch of the pane's text) or `wide` (56rem). It caps the body and
  the header's title while the header and footer still span the column.
  `measureAlign='start'` holds the capped content to the start instead of
  centring it.
- 7b36ba3: Add `QRCode` for scanning tickets at the gate, from
  `@oztix/roadie-components/qr-code`. It encodes `value` at error correction
  level H and, by default, puts the Oztix mark on a dark 5×5-module tile in the
  centre. Pass `children` to use your own mark, or `branded={false}` for a plain
  code. It's always dark on white, whatever the theme or intent, and has no
  hooks, so it renders in server components.

### Patch Changes

- dba660b: A `Card` with `direction='auto'` is now a container named `card`, so its
  children can use `@min-[30rem]/card:` and know it resolves against the card
  rather than a container further up.
- dba660b: `Drawer.Handle` now uses the divider colour, so it shows on the drawer's
  floating surface in light and dark mode. It used the sunken fill, which sat a
  single step off the surface in light mode and read as missing.
- dba660b: `Drawer.Header` and `Drawer.Footer` cast a shadow over the body while it
  scrolls beneath them, so a long list reads as passing under the header and
  footer rather than being cut off. Each shadow fades out when there's nothing
  left to scroll on its side.
- dba660b: On the phone tab bar with a pinned item, the tabs now start at the leading
  edge instead of centring, and both the tabs and the pinned circle sit 1rem in
  from the edges, where the circles land when the bar collapses on scroll.
- Updated dependencies [dba660b]
- Updated dependencies [dba660b]
- Updated dependencies [dba660b]
  - @oztix/roadie-core@2.9.0

## 2.13.0

### Minor Changes

- a234c45: `Accordion` now publishes `--content-inset` (16px) and both its trigger and
  content read it, so content dropped into `Accordion.Content` lines up with the
  trigger without extra padding. Override the variable on the root to change both
  at once. In Safari, an open panel whose content changes size, such as a filtered
  list, now resizes with it instead of clipping.
- 0c826c5: Add `hideLabel` to `Badge`. It shrinks the badge to a dot, sized by `size` and
  painted by `intent` and `emphasis`, and keeps the label visually hidden so
  screen readers still announce it. It implies `indicator`, and `indicatorPulse`
  pulses the dot.
- 65ba926: Add `Drawer`, a surface that slides in from any edge and swipes away, built on
  Base UI's drawer primitive. Core gains the `motion-drawer` utility, which drives
  a drawer's edge transition and tracks Base UI's live swipe offset.
- db10921: Add `List`, the vertical row primitive: a title with optional description,
  leading and trailing slots, a drill-in chevron, grouped sections with titles,
  and `href` rows that route through `RoadieLinkProvider`. A row's description is
  announced as its description rather than as part of its name, the leading and
  trailing slots carry `data-slot`, and `List.GroupTitle` is an `<h2>` whose level
  `render` changes, such as `render={<h3 />}`.
- 857ade4: Add `Logo`, the Oztix logo in a fixed brand colour, with `normal`, `mark` and
  `wordmark` variants. `product` pairs the mark with a product name as live text,
  such as `<Logo product='Studio' />`, and a `size` prop (`xs`–`xl`, default `md`)
  scales the whole logo by its height. The lockup is always left to right, so
  right-to-left pages never mirror it.
- f3990bd: Add `Navigator` and `Pane`, the application frame.

  `Navigator` is one navigation model at every size: floating capsules down the
  side from `md`, with a brand (the Oztix `Logo` by default), pinned items and an
  optional expanded state with labels, and a floating tab bar on phones. An item
  always links to its declared `href`, so tapping a top-level item goes to that
  destination's root wherever you were inside it. Items declare `placement` and
  `visibilityPriority`; whatever doesn't fit folds into a generated More pane. A
  destination's pages open in a generated list pane declared with
  `Navigator.Secondary`, optionally searchable, and an item can own a
  `Navigator.Menu` instead. `Navigator.Primary` must be a direct child of
  `Navigator`. Every other child of `Navigator`, parallel-route slots included,
  renders inside the panes row, so a toaster or banner belongs outside
  `Navigator` or in a `Pane`.

  `Pane` is a scrolling column with sticky chrome, a collapse-on-scroll header
  and a stack position when panes share a screen. A bare `Pane` is a detail
  (`column` defaults to `'detail'`), so give a root pane `column='list'`. `tabBar`
  sets what the phone tab bar does while the pane is top, and `depth` is only for
  a pane rendered out of document order. Roadie derives depth from render order
  otherwise, on the server too. `Navigator` lays panes out as columns from its
  own width (two from 46.25rem, three from 76rem) and stacks them below that. Full
  columns need container style queries, in Chrome 111, Safari 18 and Firefox 151.
  Older browsers get the top pane, with the root beside it from 46.25rem. A
  stacked pane that mounts as the new top slides in like one that was already
  there, so a route-driven detail pane animates on a push; a first
  paint, hydration and reduced motion never slide. A pop moves the pane behind,
  which slides back as the one above it is removed; the pane being left is not
  animated out. Swapping a sibling cuts. A commit that replaces a pane with
  another at the same depth, leaving the stack the shape it was, is not a push.
  Switching top-level item cuts too, whatever stack the incoming route draws. A
  `Navigator.Secondary` with `overview` draws every one of its routes in one
  pane, so a step between its pages has no pane of its own to move. The page
  being left is copied into an inert document and slid away while the arriving
  one comes over it. That copy is the one in the frame, and only an overview
  step makes one. `Pane.Search` is a pill search field with a Cancel.

  `Pane` and `Pane.Body` each hold a Suspense boundary, so a suspension inside a
  pane stops at the pane and its header stays on screen. Either boundary holds the frame's pending indicator
  automatically while it waits, but a transition into a suspending child of the
  same pane keeps the old content on screen instead of showing a fallback, so
  that case reports nothing automatic; `usePendingNavigation`'s `start`/`stop`
  covers it, and `pending` on `Pane` covers a wait Roadie can't see at all, such
  as a fetch without Suspense. A route's `loading.tsx` is optional; it only buys
  Next's partial prefetch. The indicator itself is app-wide, one glow for the
  whole frame. After 150ms with nothing changed yet, it fills with a slowly
  turning gradient of three Oztix colours behind the panes and the nav, and on a
  phone the panes pull back and round their corners to show it. It goes when the
  destination lands, and a navigation faster than 150ms shows nothing.
  `RoadieLinkProvider` marks a plain click on the internal href of any Roadie
  surface that takes one, and takes `pendingIndicator={false}` to turn it off.

  A pane takes its scroll down against the browser's own id for the history entry
  it is on, so going back or forward through history puts every pane where it was.
  Going forward, the pane the navigation arrives at starts at the top and the pane
  it leaves keeps its place. The top of the stack is the deepest reached pane, so
  the pane a route drilled from keeps its scroll. Scroll restoration reads no URL
  and writes no history state. It reads `navigation.currentEntry.key`, and where an engine has no Navigation API panes
  keep starting at the top.

  `Pane.Header` keeps `backHref` as a real routed link, but a plain Back or Close
  click now traverses browser history when the immediately previous
  same-document entry matches its origin, path and query. That preserves the
  parent's mounted state and avoids adding a duplicate parent entry. Direct loads,
  reloads, unrelated history, modified clicks and browsers without the Navigation
  API keep following the canonical link normally.

  Also ships `Navigator.ExpandToggle`, `Navigator.SecondaryPane` and
  `Navigator.SecondaryItems`, with `useNavigatorSecondary` for reading a
  destination's items outside the generated pane. `showList` and `showMore` put
  the list and More in the URL; `expandedFromDocument` pairs with
  `getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`.

- f3990bd: **Peer dependency change: React 19.2 or later is now required.** The `react`
  and `react-dom` peer ranges move from `^19.0.0` to `^19.2.0` in both packages.
  Upgrade React to 19.2 before taking this release. Roadie now uses
  `useEffectEvent`, which first shipped in React 19.2. The widgets' React peer
  stays optional, so Vue-only installs are unaffected.
- dc7588b: Add `ScrollArea`, which gives any bounded region a consistent custom scrollbar.
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

- 6fda90c: Add `Tooltip`, a short label that appears beside a control on hover or keyboard
  focus, built on Base UI's tooltip primitive. `Tooltip.Content` takes `side`,
  `align` and `sideOffset` directly, `emphasis` switches between the `strong` chip
  (the default; give `Tooltip.Content` an intent class to colour it) and the
  `floating` popover surface, and `Tooltip.Provider` groups tooltips so moving
  between neighbours is instant.

### Patch Changes

- 4deb856: `Button` and `IconButton` with `href` render a link, not a button: Enter follows it, Space scrolls the page, and `download` is accepted.
- f3990bd: A horizontal `Tabs.List` that outgrows its container now scrolls sideways, with the scrollbar hidden, instead of overflowing the layout, and keeps the active tab in view. The `subtler` emphasis draws its focus ring inside the tab so the scrolling list doesn't clip it.
- Updated dependencies [f3990bd]
- Updated dependencies [f3990bd]
- Updated dependencies [65ba926]
- Updated dependencies [4deb856]
- Updated dependencies [8c2ca73]
- Updated dependencies [5363c7a]
  - @oztix/roadie-core@2.8.0

## 2.12.1

### Patch Changes

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

- Updated dependencies [8c8b666]
  - @oztix/roadie-core@2.7.0

## 2.12.0

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

### Patch Changes

- Updated dependencies [c989b7e]
  - @oztix/roadie-core@2.6.0

## 2.11.0

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

### Patch Changes

- Updated dependencies [5d05bd1]
  - @oztix/roadie-core@2.5.0

## 2.10.0

### Minor Changes

- ba6b822: - **New `@oztix/roadie-components/css`** — a Tailwind source-registration entry.
  Tailwind v4 ignores `node_modules`, so consumers previously hand-wrote
  `@source "../../node_modules/@oztix/roadie-components/dist"` (brittle when
  `globals.css` moves). Now `@import '@oztix/roadie-components/css'` — the package
  ships its own `@source` relative to itself. Each package's CSS registers only
  its own classes, so import every Roadie package you use.
  - **`Separator` hairline fix** — it now renders a true 1px line. The base
    `border` applied width to all four sides, so with `h-px` the top and bottom
    both painted (~2px). Colour/style now live in the base and each orientation
    sets a single-side width (`border-t` / `border-l`).

### Patch Changes

- Updated dependencies [5e3b922]
  - @oztix/roadie-core@2.4.0

## 2.9.1

### Patch Changes

- 635f07e: `Separator` now renders a true 1px hairline. The base `border` applied a width
  to all four sides, so with `h-px` the top and bottom borders both painted and
  read as ~2px. The colour and style now live in the base and each orientation
  sets a single-side width (`border-t` / `border-l`).

## 2.9.0

### Minor Changes

- 0ba959a: Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.
  - **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
  - **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
  - **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.

### Patch Changes

- Updated dependencies [82ae89b]
- Updated dependencies [0ba959a]
  - @oztix/roadie-core@2.3.0

## 2.8.0

### Minor Changes

- d4d2e20: Add **EmptyState** — a compound component for empty/zero states that scales
  from a small empty section to a whole-page empty/404 screen via a single
  `size` token (sm/md/lg).

  Sub-components: `EmptyState.IconTile` (Phosphor icon in a tinted circle),
  `EmptyState.Illustration` (SpotIllustration or custom hero), `EmptyState.Title`
  (size-scaled, heading level overridable via `render`), `EmptyState.Description`,
  and `EmptyState.Actions`. Size flows through context, so each slot scales
  itself; the recommended media pairing is sm→IconTile, md→SpotIllustration,
  lg→hero. The root takes an optional `intent` prop (no default — omit to
  inherit the palette from an ancestor), so the IconTile and Buttons inside
  share one colour context. Available from the barrel and the
  `@oztix/roadie-components/empty-state` subpath.

## 2.7.0

### Minor Changes

- 2a43e97: Add Dialog, Popover, and IconTile components.
  - **Dialog** / **Popover** — `@base-ui/react` compounds with `*.Content` shortcuts, `Header`/`Body`/`Footer`, and an `intent` variant on the popup. Dialog adds `sm`/`md`/`lg` sizes; Popover adds `Arrow`, `positionerProps` placement, and `openOnHover`.
  - **IconTile** — a tile that frames a single Phosphor icon, with `xs`–`3xl` sizes, `intent`/`emphasis` variants, and `square` (default) / `circle` shapes.
  - **core**: new `layering.css` z-index scale emitting named utilities (`z-overlay`, `z-modal`, `z-popover`, …), reusable `motion-scale` / `motion-slide` enter/exit utilities in `motion.css`, and a `--rim-light-edge` token in `elevation.css`.

### Patch Changes

- Updated dependencies [2a43e97]
  - @oztix/roadie-core@2.2.0

## 2.6.0

### Minor Changes

- 1aaac77: Smart `href` routing across every link-bearing component, plus
  `RoadieLinkProvider` for app-level Link injection. `LinkButton` /
  `LinkIconButton` are now soft-deprecated.

  ## What's new
  - **`RoadieLinkProvider`** — a single context-injected provider that
    supplies the consumer's Link component (typically `next/link`) to
    every Roadie surface that accepts `href`. Wire it once at the app
    root, and internal links route through your client router
    automatically. Apps without a provider fall back to plain `<a>`.

    ```tsx
    import NextLink from 'next/link'

    import { RoadieLinkProvider, ThemeProvider } from '@oztix/roadie-components'

    ;<RoadieLinkProvider Link={NextLink}>
      <ThemeProvider>{children}</ThemeProvider>
    </RoadieLinkProvider>
    ```

  - **`href` on every link-bearing component** — `Button`, `IconButton`,
    `Card`, `Breadcrumb.Link`, `Carousel.TitleLink`, and `Tabs.Tab` now
    accept `href`. Internal hrefs route through the configured Link;
    external hrefs (`http(s)://`, `//…`) auto-render
    `<a target='_blank' rel='noopener noreferrer'>`; `mailto:` / `tel:` /
    `sms:` render plain `<a>` with no target. Override via `external`,
    `target`, or `rel`.

    ```tsx
    <Button href='/events/123'>View event</Button>
    <Button href='https://stripe.com/docs'>Stripe docs</Button>
    <Card href='/event/123'>{/* whole-card link, with is-interactive */}</Card>
    <Breadcrumb.Link href='/events'>Events</Breadcrumb.Link>
    <Tabs.Tab value='events' href='/events'>Events</Tabs.Tab>
    ```

  - **`IconButton` size DX** — accepts plain `'xs' | 'sm' | 'md' | 'lg'`
    and maps to the underlying `btn-icon-*` classes. Default flips from
    `'icon-md'` to `'md'`. Legacy `'icon-*'` literals still accepted via
    a `@deprecated` alias.

  ## What's deprecated (still works, removed in v3.0.0)
  - **`LinkButton` / `LinkIconButton`** — JSDoc `@deprecated`. They keep
    their public type signatures (including the `<T extends ElementType>`
    generic and the `as` prop) and their original anchor-with-button-
    classes rendering. New code should use `<Button href={…}>` and
    `<IconButton href={…}>` instead.
  - **`'icon-*'` size literals on `IconButton` / `LinkIconButton`** —
    use `'xs' | 'sm' | 'md' | 'lg'` instead.
  - **`as` prop on `Card` / `Breadcrumb.Link` / `Carousel.TitleLink`** —
    unified on `render` as the universal escape hatch. Every Roadie
    component now accepts the same `render` prop (element / component /
    function form), mirroring Base UI's contract. Non-Base-UI components
    compose a small `useRender` helper internally to deliver the same
    semantics. The `as` prop continues to work for back-compat.

    ```tsx
    // Before
    <Card as='button' onClick={handleSelect}>…</Card>
    <Card as={MyLink} href='/x'>…</Card>

    // After
    <Card render={<button type='button' onClick={handleSelect} />}>…</Card>
    <Card render={<MyLink href='/x' />}>…</Card>
    ```

  ## Notes for consumers
  - Existing `<Button onClick={…}>`, `<Button render={<a>}>`, and
    `<Card as='a' href=…>` call sites are untouched.
  - Passing both `href` and an explicit `render` to Button emits a
    one-shot dev-mode warning — `render` wins, provider routing is
    silently disabled. Pick one.
  - `as` always wins over `href` smart-routing for non-Base-UI
    components (Card, Breadcrumb.Link, Carousel.TitleLink). It's the
    documented escape hatch.
  - Server-safe components (Card, Breadcrumb.Link) stay server-safe —
    the smart-href delegation crosses to the client only when `href` is
    set, via Next's standard module-graph boundary.

  ## Where to read more
  - Full plan: `docs/plans/2026-04-28-001-feat-roadie-link-provider-and-tracking-pattern-plan.md`
  - Foundations / Linking docs page (forthcoming)

## 2.5.0

### Minor Changes

- 26cf350: Add `Tabs` compound built on Base UI Tabs. Four `emphasis` presets (`strong`,
  `normal`, `subtle`, `subtler`) share a single animated `<Tabs.Indicator>`
  whose geometry follows the active tab via Base UI's `--active-tab-*` CSS
  variables, with `prefers-reduced-motion` honoured. Roadie's `direction`
  prop renames Base UI's `orientation`; vertical mode left-aligns tab content
  and swaps the `subtler` underline onto the left edge. Per-file leaves with
  a server-safe `index.tsx` keep the compound RSC-safe via both the new
  `@oztix/roadie-components/tabs` subpath and the root barrel.

## 2.4.0

### Minor Changes

- 225ce2c: **Theming API improvements — controlled accent, validation, and pre-hydration bootstrap**

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

### Patch Changes

- Updated dependencies [225ce2c]
  - @oztix/roadie-core@2.1.0

## 2.3.0

### Minor Changes

- d317bad: Phase 3 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. Every compound in the package is now **RSC-safe by construction**: consumers can render `<Fieldset>`, `<Accordion>`, `<Card>`, `<Carousel>`, `<Combobox>`, `<Select>`, `<Autocomplete>`, `<RadioGroup>`, `<Steps>`, `<Field>`, `<Breadcrumb>` — and dot into their sub-components like `<Accordion.Item>`, `<Select.Trigger>`, `<Carousel.Content>` — from a Next.js server component, via either the root barrel or the new per-compound subpath entries. The minor bump is for the new subpath surface and the new `.Root` alias; the bare-root consumer form (`<Compound>`) is unchanged so **nothing existing breaks**.

  **Zero breaking change.** `Fieldset === Fieldset.Root` (same function reference), and every other compound follows suit. Existing code using bare `<Fieldset>` / `<Card>` / `<Accordion>` works exactly as before. `.Root` is a Base UI-parity alias, not a required migration.

  **New subpath entries.** Every compound ships from its own subpath (`@oztix/roadie-components/fieldset`, `/card`, `/accordion`, `/select`, `/combobox`, `/autocomplete`, `/radio-group`, `/carousel`, `/steps`, `/field`, `/breadcrumb`, …). 24 subpath keys generated into `package.json`'s `exports` block. Subpath form is preferred in Next.js consumers because it scopes the compiler walk to one compound.

  **New: `data-slot` attribute on every rendered DOM element.** Shadcn-style addressable markers — `<Fieldset.Legend>` renders `data-slot="fieldset-legend"`, `<Carousel.NavButton>` renders `data-slot="carousel-nav-button"`. Consumers can target these in CSS, Tailwind variants, visual regression tooling, and tests without depending on internal class names.

  **New sub-component prop-type exports on the barrel.** Breadcrumb, Card, Field, Steps, Autocomplete, Combobox, Select, Carousel, RadioGroup, Fieldset, Accordion all now export their full per-sub-component prop type surface (e.g. `BreadcrumbListProps`, `CardHeaderProps`, `SelectTriggerProps`, `CarouselContentProps`, `StepsItemProps`, etc.) for consumers annotating custom wrappers.

  **Build shape: tsdown `unbundle: true`.** Previously the components package bundled each compound folder into a single dist file; it now emits one dist file per source file, preserving the source directory structure 1:1 under `dist/components/<Compound>/`. Rolldown (tsdown's backend) preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source. Each compound's `index.tsx` ships **without** `'use client'` — it's a server-safe property-assignment layer that Next.js can follow through to each leaf at build time. This is the load-bearing change that makes dot-access work across the RSC boundary.

  **11 compounds migrated** (pilot + follow-ups): Fieldset, Accordion, RadioGroup, Breadcrumb, Card, Steps, Field, Select, Autocomplete, Combobox, Carousel. Every compound folder now contains per-file sub-component leaves, a shared `*Context.ts` where needed, `variants.ts` where it has CVA maps, a server-safe `index.tsx` attachment layer, and a test file exercising both `<Compound>` (canonical) and `<Compound.Root>` (alias) forms.

  Full rationale, the three rejected attempts, and the authoring checklist for new compounds are in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../docs/solutions/rsc-patterns/compound-export-namespace.md) and [`docs/contributing/COMPOUND_PATTERNS.md`](../docs/contributing/COMPOUND_PATTERNS.md).

## 2.2.0

### Minor Changes

- f2eb334: Components consistency cleanup, Phases 1 & 2 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. No runtime behaviour change; the minor bump is for the server-safety improvement plus the removal of three `@deprecated` type aliases.

  **New: server-safe by default.** `Input`, `Textarea`, and `Highlight` no longer emit `'use client'`. Consumers can render them from Next.js server components without forcing a client boundary. Verified on the compiled dist — the entries no longer start with the directive. Existing client-component usage continues to work unchanged.

  **Removed: deprecated type aliases.** The three `@deprecated` aliases left in place by the Pattern A migration (#36) are deleted:
  - `SelectRootProps` → use `SelectProps`
  - `ComboboxRootProps` → use `ComboboxProps`
  - `AutocompleteRootProps` → use `AutocompleteProps`

  Also removed (never re-exported from the package barrel, so not part of the documented surface): `SelectTriggerVariantProps` (misnamed re-export) and the `HighlightChunk` type export (kept as a local type inside `Highlight/index.tsx`).

  **Internal cleanups (no API change):**
  - Every Phosphor import in the components package now uses `@phosphor-icons/react/ssr` (Accordion, Select, Combobox, Autocomplete, Steps; Carousel was already on `/ssr`). One import path now works in both server and client components.
  - `Steps` and `Carousel` `direction` variant entries switched from dead `''` strings to `undefined` so the variant API stays intact without stringly-typed noise.
  - `Highlight`'s redundant `query === ''` clause dropped (already covered by `!query`).
  - `BASE_UI.md` §7 gained a "server-safe by default" authoring rule, and the §11 skeleton template's `Object.assign` form was replaced with direct assignment + a `TODO(Phase 3)` marker pointing at the upcoming `export * as` migration.

## 2.1.1

### Patch Changes

- ba58fd6: Migrate every compound component to Pattern A (named exports + property assignment), matching the Carousel convention. Purely structural — consumer imports and the compound API (`<Select>`, `<Select.Trigger>`, `<Card.Header>`, etc.) are unchanged.

  Affected compounds: Accordion, Autocomplete, Breadcrumb, Card, Combobox, Field, Fieldset, RadioGroup, Select, Steps.

  Under the hood:
  - Root functions renamed from `XRoot` → `X` where applicable (internal names only; these were never exported from the package barrel)
  - Subcomponent `interface X extends Y` prop types converted to `type X = Y & { ... }` for `BreadcrumbSeparatorProps`, `FieldLabelProps`, `FieldHelperTextProps`, `FieldErrorTextProps`, `FieldsetLegendProps`, `FieldsetHelperTextProps`, `FieldsetErrorTextProps`, `RadioGroupLabelProps`, `RadioGroupHelperTextProps`, `RadioGroupErrorTextProps`, `SelectHelperTextProps`, `SelectErrorTextProps`, `SelectContentProps`
  - Root prop types renamed to match convention where previously suffixed with `Root` (`SelectRootProps` → `SelectProps`, `ComboboxRootProps` → `ComboboxProps`, `AutocompleteRootProps` → `AutocompleteProps`, `FieldsetRootProps` → `FieldsetProps`, `FieldRootProps` → `FieldProps`, `RadioGroupRootProps` → `RadioGroupProps`). The old `*RootProps` names remain as `@deprecated` type aliases where they were re-exported from the package barrel (`SelectRootProps`, `ComboboxRootProps`, `AutocompleteRootProps`) for backwards compatibility
  - `LinkButton` / `LinkIconButton`: inlined CVA variant props (`intent`, `emphasis`) as literal unions rather than `VariantProps<typeof buttonVariants>['key']`, which `react-docgen-typescript` couldn't drill into. New exported type aliases: `LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize` for consumers who want to annotate their own wrappers

## 2.1.0

### Minor Changes

- 7685819: Add `Carousel` compound component built on Embla v9.

  New parts:
  - `Carousel` root with `direction`, `autoPlay`, `opts`, and `aria-label` props.
  - `Carousel.Header` — responsive three-slot layout (title left, dots
    centered, controls right on desktop; collapses to flex `justify-between`
    on mobile). Children are placed by source order so consumers can drop
    arbitrary nodes into any slot.
  - `Carousel.Title` (`<h2>` with `as` prop for heading level) and
    `Carousel.TitleLink` (anchor with trailing arrow icon and `as` for
    framework router links).
  - `Carousel.Controls` — inline flex row that hides on mobile by default
    (`hidden md:flex`) and hides entirely when there's nothing to scroll
    to. Pass `forceVisible` to keep it rendered.
  - `Carousel.Content` — Embla viewport + container. New `overflow` prop
    with `subtle` (default) / `hidden` / `visible` options. `subtle`
    bleeds slides past the gutter and fades them to the page background
    via `::before` / `::after` gradient overlays.
  - `Carousel.Item` — single slide. Uses Embla's `slidesinview` event to
    drive the `inert` attribute, so every visible slide in a multi-visible
    layout (e.g. `basis-1/3` with 4 cards) stays interactive.
  - `Carousel.Previous` / `Carousel.Next` — nav buttons compose `IconButton`.
    Auto-hide when `canScroll` is false.
  - `Carousel.PlayPause` — play/pause toggle, renders only when `autoPlay`
    is set.
  - `Carousel.Dots` — one button per _Embla snap_ (not per slide), so
    multi-visible layouts get the correct dot count. Also auto-hides when
    there's nothing to scroll.
  - `useCarousel()` hook returns `{ state, actions }`. `useCarouselUnsafeEmbla()`
    is the explicit escape hatch for consumers that need the raw Embla
    `api` — named separately so raw-Embla coupling is greppable.

  Behaviour notes:
  - `align: 'start'` is the Roadie default in `resolvedOpts` (consumers can
    still override via `opts`).
  - Embla's `snapList()` feeds a `snapCount` state that powers all
    navigation logic, so `canGoToPrev` / `canGoToNext` / `canScroll` /
    `Carousel.Dots` all work correctly for multi-visible layouts.
  - Keyboard nav (`ArrowLeft`/`Right`, `ArrowUp`/`Down` in vertical mode,
    `Home` / `End`) on the viewport; arrow keys yield to focusable
    content inside slides.
  - `prefers-reduced-motion: reduce` disables the autoplay plugin
    entirely and sets Embla's `duration` to 0 for instant transitions.
  - WCAG 2.2.2-compliant pause model: `Carousel.PlayPause` is a sticky
    toggle; hover / focus pause the plugin transiently without retriggering
    the live region.
  - `safePluginCall` warns in dev when Embla's autoplay plugin throws
    instead of silently swallowing the error.

## 2.0.2

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

- Updated dependencies [4f929b8]
  - @oztix/roadie-core@2.0.1

## 2.0.1

### Patch Changes

- d4f9539: Fix .d.ts type resolution for pnpm consumers. Use named prop types with type aliases instead of ComponentProps, add RefAttributes for ref forwarding, and move @base-ui/react and class-variance-authority to peer dependencies so consumers can resolve exported types. Adds attw and check:dts build guards to prevent regressions.

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

### Patch Changes

- Updated dependencies [0645262]
  - @oztix/roadie-core@2.0.0

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

### Patch Changes

- Updated dependencies [d9a0534]
  - @oztix/roadie-core@1.2.0

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

### Patch Changes

- Updated dependencies [6e05fb8]
  - @oztix/roadie-core@1.1.0

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

### Patch Changes

- 0125940: Added src files to package
- Updated dependencies [8481943]
  - @oztix/roadie-core@1.0.0

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button
- Updated dependencies [f2aa279]
  - @oztix/roadie-core@0.2.1

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

### Patch Changes

- Updated dependencies [94d8153]
  - @oztix/roadie-core@0.2.0

## 0.1.1

### Patch Changes

- 77cd753: Improve build for tree-shaking and code-splitting

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing

### Patch Changes

- Updated dependencies
  - @oztix/roadie-core@0.1.0
