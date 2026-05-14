---
date: 2026-05-14
topic: image-component
---

# Image Component

## What We're Building

A new `<Image>` primitive in `@oztix/roadie-components` that wraps a plain
`<img>` and pushes every Oztix-CDN asset through the ImageSharp.Web resize
proxy (`?width=&height=&format=webp`) plus a sensible 1x/2x `srcSet`.
Off-Oztix URLs pass through unchanged so external thumbnails still work.

A companion utility module in `@oztix/roadie-core/image` (`oztixImageAtWidth`,
`oztixSrcSet`, `isOztixImageUrl`) ships the pure URL-rewriting functions so
consumers building custom compositions (LQIP banners, art-directed
backgrounds, server-side `srcSet` generation) can reach for them without
importing the component.

Once it lands, `Card.Image` swaps its internal `<img>` for the new `<Image>`,
giving every existing carousel-and-grid surface across our apps a free,
zero-config win on image bytes and decoded memory.

## Why This Approach

We hit this in `Website.WynnumFringeSplash` (see PR #28 in that repo):
Safari Mobile was crashing on the home page. Profiling traced it to
`next.config.ts` having `images.unoptimized: true` — every `<Image>` was
rendering as a raw `<img>` with the source URL untouched. Two Oztix-served
PNGs (the festival logo, 3300 × 1111, and the hero, 2000 × 800) were
responsible for ~28 MB and ~6 MB of decoded bitmap respectively. The page
was holding ~50 MB of decoded image RAM before the JS heap, carousel libs,
and view-transition snapshots layered on top.

The fix landed in that repo as a local `<Image>` component plus helpers in
`lib/eventImage.ts`. Decoded RAM on home dropped from ~50 MB to ~23 MB.
But the moment we wrote it we noticed two things:

1. **This is Roadie's job.** The Oztix CDN is part of the platform, not a
   private detail. Roadie's README declares scope as "a design system for
   Oztix's applications." Every TicketSolutions site will eventually need
   the same helper.
2. **`next/image` doesn't help us.** `unoptimized` is on because consumer
   apps run on different hosts (Amplify Hosting Compute, S3 + CloudFront,
   etc.) and configuring `remotePatterns` per app + image origin is fragile.
   The Oztix CDN already does server-side resize/transcode — we just need
   to ask for it.

A Roadie component eliminates the per-app reimplementation, gives us a
single choke point to add features (low-quality placeholders, lazy mounting,
art direction) later, and lets us upgrade `Card.Image` to be size-aware
without touching consumer code.

## Key Decisions

### API shape: `next/image`-shaped, minus the build-time optimizer

```tsx
<Image
  src='https://assets.oztix.com.au/image/<guid>.png?width=600&height=300'
  alt='Show artwork'
  width={600}
  height={300}
  widths={[600, 1200]}
  sizes='(min-width: 768px) 50vw, 100vw'
  priority
/>
```

Props:

- **`src`** *(required)* — image URL. Oztix-CDN hosts (allowlisted in
  `roadie-core/image`) get the resize/transcode rewrite; everything else
  passes through.
- **`alt`** *(required)* — standard `<img alt>`. Empty string for
  decorative; pair with `aria-hidden` at the parent for full-bleed banners.
- **`width`** *(required, number)* — 1x render width in CSS pixels.
  Drives the default `srcSet` and `sizes`.
- **`height`** *(optional, number)* — intrinsic / 1x render height.
  Forwarded to the `<img>` to avoid layout shift before load. Omit when
  using `object-cover` over a constrained parent.
- **`widths`** *(optional, number[])* — explicit srcSet ladder. Defaults
  to `[width, width * 2]`. Pass a wider ladder for hero-class imagery
  that scales across breakpoints.
- **`sizes`** *(optional, string)* — `<img sizes>`. Defaults to
  `${width}px` when a srcSet is emitted.
- **`priority`** *(optional, boolean)* — LCP marker. Flips `loading` to
  `eager` and sets `fetchpriority="high"`. Default `false`.
- **`loading`** *(optional)* — explicit override. Defaults to `lazy`,
  or `eager` when `priority` is on.
- **`format`** *(optional, `'webp' | 'png' | 'jpg'`)* — explicit format
  override. Defaults to `webp`. AVIF isn't enabled server-side
  (`/Users/lukebrooker/Code/TicketSolutions.Assets/src/TicketSolutions.Assets.Api/Configure/ImageSharpWeb.cs` —
  only `FormatWebProcessor` is wired, and a `format=avif` request silently
  falls back to PNG today; revisit when ImageSharp's AVIF processor lands).
- **`...rest`** — every other `<img>` attribute passes through verbatim
  (`className`, `decoding`, `id`, `onLoad`, etc.). The component is a
  zero-overhead wrapper around `<img>` — no portal, no wrapping `<div>`,
  no extra DOM.

Why no `fill` (à la `next/image`): the parent owns layout. Pass `width`
plus `object-cover` + a `className` like `absolute inset-0 size-full
object-cover` and the consumer gets the same result without a magic
sentinel. Matches how the rest of Roadie defers layout to consumers
(`Carousel.Item` uses `basis-*`, `Card` uses `className`).

Why no `placeholder='blur'` (à la `next/image`): a server-rendered LQIP
needs the source's averaged colour, which we don't have on the client.
LQIP-as-a-tiny-version-of-the-real-image is doable but requires a wrapper
element to position the blur underneath — exactly the shape of
`EventBannerImage` in the Wynnum Fringe app. Leave that as a *consumer
composition*, not a baked-in mode. If multiple consumers reinvent it, we
can promote a `BlurImage` to Roadie later.

### URL rewriting: opinionated host allowlist in `roadie-core/image`

```ts
// @oztix/roadie-core/image
export const OZTIX_IMAGE_HOSTS = new Set([
  'assets.oztix.com.au',
  'd3fcfeclx4v047.cloudfront.net',
  'dp4qkqhwvriyk.cloudfront.net',
])

export function isOztixImageUrl(src: string): boolean
export function oztixImageAtWidth(
  src: string,
  width: number,
  opts?: { format?: 'webp' | 'png' | 'jpg' },
): string
export function oztixSrcSet(
  src: string,
  widths: number[],
  opts?: { format?: 'webp' | 'png' | 'jpg' },
): string | undefined
```

Pure functions. No React. Sit alongside `core/utils/cn.ts`. Available to
consumers building custom compositions (LQIP banners, server-side `srcSet`
for raw `<img>` tags, CSS `background-image` URLs) without dragging in the
React component.

The allowlist matters because we *don't* want to attach `?width=&format=`
to third-party signed S3 URLs, Sanity asset URLs, or arbitrary external
thumbnails — for those, the params would either break the signature or
be ignored. Allowlist = explicit safety; non-Oztix URLs become "the
component is a pass-through `<img>`."

If a non-Oztix consumer ever needs Roadie (Roadie's README says no, but
just in case), the escape hatch is a `loader?: (src, width) => string`
prop on `<Image>`, lifted from `next/image`'s playbook. **Not shipping
in v1** — adding it later is non-breaking; removing baked-in CDN
knowledge later isn't. YAGNI.

### Format: `format=webp` by default

The Oztix ImageSharp proxy serves `image/webp` natively when
`format=webp` is on the query. Verified end-to-end against
`assets.oztix.com.au` — content-type comes back as `image/webp`, size
drops materially vs PNG. WebP is universally supported in the browsers
Roadie targets (Safari ≥ 14, modern Chrome/Firefox/Edge).

AVIF is not enabled on the proxy today (see decision above). When it
lands server-side, we ship `format=avif` as the default and webp becomes
the fallback via `<picture>`. That's a future change to `<Image>`, not
a breaking one — the API doesn't shift.

### srcSet: 1x/2x by default, explicit ladder when needed

Default `widths` is `[width, width * 2]`. This handles 99% of cases:

- Logo at `width={175}` → ladder `[175, 350]`, sizes `175px`.
- Square card at `width={360}` → ladder `[360, 720]`, sizes `360px`.

For hero-class imagery that stretches across breakpoints, pass an explicit
ladder + `sizes`:

```tsx
<Image
  src={heroUrl}
  width={1200}
  height={480}
  widths={[768, 1200, 1600, 2400]}
  sizes='100vw'
  priority
/>
```

The proxy caps width at 4000 px (`ImageSharpWeb.cs` line 39), so any
ladder entry over 4000 is silently dropped server-side. We don't enforce
that client-side — consumers can throw whatever they want at it.

### Lazy loading: `loading='lazy'` by default + IntersectionObserver opt-in (deferred)

Default is `loading='lazy'`, `priority` flips to `eager`. That matches
every other framework's defaults and is enough for above/below-the-fold
distinction on most layouts.

**It is not enough for `Carousel`.** Embla renders every slide into the
DOM at horizontal offsets; native `loading='lazy'` has a generous
viewport buffer (~3000 px in Chrome, less in Safari), so slides several
positions to the right still fetch eagerly. On a category page with five
carousels of eight items each, that's 40+ images fetched on first paint.

The right fix is an IntersectionObserver-backed mode that only sets
`src` when the tile is near the viewport. Two options:

1. **Bake it into `<Image lazy='intersection'>`** — explicit opt-in, but
   most consumers don't think about it.
2. **Bake it into `Card.Image`** when the parent `<Carousel>` is in
   context — automatic for the surface that needs it most.

Likely a separate, follow-on RFC after the base component lands. Worth
naming here so the design accommodates it. Concrete shape: `<Image>`
accepts a `defer?: boolean` prop (or context override from
`Carousel.Content`) that switches it to "render a placeholder until
intersection." The placeholder is just an `<img>` with no `src` and the
declared `width`/`height` so layout doesn't shift.

### `Card.Image` migration

```tsx
// Before
export function CardImage({ className, ...props }: CardImageProps) {
  return (
    <div data-slot='card-image' className='overflow-hidden rounded-xl'>
      <img className={cn('aspect-2/1 …', className)} {...props} />
    </div>
  )
}
```

After: same shape, but the inner `<img>` becomes `<Image>`. The
challenge is that `Card.Image` currently accepts every `<img>` attr but
*not* `width` / `widths` / `sizes` as anything special. We have two
paths:

**A. Make `Card.Image` accept `<Image>`'s extended props.** Add `width`
(required when `src` is set), `widths?`, `sizes?`, `priority?`,
`format?`. Existing consumers passing just `src` + `alt` need to add
`width` — a small, mechanical migration. Tracked behind a major version
bump.

**B. Keep `Card.Image` as a thin styled wrapper, expose a sibling
`Card.ResizableImage` (or `Card.Image` accepts an optional `as={Image}`
escape).** Lower migration cost, two ways to do it, more API surface.

**Recommendation: A**, with a codemod / changeset notes for the
migration. Cleaner long-term, and the migration is a one-line addition
per call site.

## Open Questions

- **Bundle weight.** The component is ~30 LOC + the core helpers (~50
  LOC). Negligible. `roadie-core/image` adds one new entry point — worth
  confirming the tsup config picks it up automatically (it should, given
  how `utils/cn.ts` is exported).
- **`width` as a hint vs. a hard intrinsic.** `next/image` requires it
  for layout reservation. We do too, but only for the srcSet/sizes
  defaults — the actual `<img width=>` HTML attribute can be set to the
  declared value for layout reservation. Should we *also* set
  `style={{ aspectRatio: width / height }}` when both are present? It
  prevents CLS more reliably than the attribute alone. Cost: one inline
  style.
- **TypeScript export shape.** `Image` should be `forwardRef`-friendly
  so consumers can attach refs for `IntersectionObserver`,
  measurement, etc. Even though we don't need it internally, exposing it
  costs nothing.
- **Docs site coverage.** A new MDX page under
  `docs/src/app/components/image/` mirroring the structure of
  `card/page.mdx` — props table, live examples, dark mode toggle,
  before/after byte comparison if we can swing it.

## Migration Notes (Wynnum Fringe consumer)

Once `<Image>` + helpers ship:

1. `src/components/Image.tsx` → re-export `Image` from
   `@oztix/roadie-components`. Or delete the file and update imports.
2. `src/lib/eventImage.ts` → `getEventImage` stays (event-specific).
   `oztixImageAtWidth` / `oztixSrcSet` / `isOztixImageUrl` re-export from
   `@oztix/roadie-core/image`.
3. `EventBannerImage` — no change needed, picks up the new helpers
   through the re-export shim.

We probably also want to keep an internal `BlurImage` composition for the
hero/banner LQIP pattern, and lift it to Roadie if a second consumer
needs the same thing.

## Out of Scope

- AVIF support (server-side change in `TicketSolutions.Assets`).
- A `placeholder='blur'` mode with server-generated LQIP data URIs.
- `loader` prop for non-Oztix CDNs. Add when a non-Oztix consumer shows
  up.
- Image art direction (`<picture>` with multiple sources at different
  breakpoints / orientations). Useful for hero/banner, but adds API
  surface; defer until a real need surfaces.
