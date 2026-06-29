---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

- **New `Image` component** (`@oztix/roadie-components`) — a size-aware `<img>`
  wrapper. Pass `width` and it requests a right-sized WebP from the Oztix CDN's
  ImageSharp.Web proxy plus a 1x/2x `srcSet`, cutting download bytes and
  decoded-bitmap memory (the Safari-mobile crash class). Non-Oztix URLs, and
  calls without a `width`, pass through as a plain `<img>`. Supports `widths`,
  `sizes`, `height` (layout reservation + `aspect-ratio`), `priority`
  (eager + `fetchpriority="high"`), `format`, and `defer` (IntersectionObserver
  loading for off-screen carousel slides).
- **New `@oztix/roadie-core/image` entry point** — pure URL helpers
  `isOztixImageUrl`, `oztixImageAtWidth`, `oztixSrcSet` (+ `OZTIX_IMAGE_HOSTS`)
  for consumers building custom compositions without the React component.
- **`Card.Image` is now size-aware** — its inner `<img>` is an `<Image>`, so it
  accepts `width`/`widths`/`sizes`/`priority`/`format`/`defer`.
  - **Behavior change:** card images now default to `loading='lazy'` (and
    `decoding='async'`), where the old bare `<img>` eager-loaded. Mark any
    above-the-fold card image `priority` to restore eager loading and protect
    LCP.
  - **Type narrowing:** `Card.Image` now requires `src`, and `width`/`height`
    are `number`-only (previously `string | number` via `ImgHTMLAttributes`).
    Numeric call sites are unaffected.
