---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

- **New `Image` component** (`@oztix/roadie-components`) — a size-aware `<img>`
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
