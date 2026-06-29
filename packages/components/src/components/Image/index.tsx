'use client'

import { type ComponentProps, useEffect, useRef, useState } from 'react'

import {
  type OztixImageFormat,
  type OztixImageOptions,
  isOztixImageUrl,
  oztixImageAtWidth
} from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import { setRef } from '../../utils/resolveRender'

const MIME: Record<OztixImageFormat, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg'
}

// Common device widths, used to build a responsive ladder for fluid images so
// small screens download small files. The proxy caps width at 4000.
const DEVICE_WIDTHS = [320, 420, 640, 768, 1024, 1280, 1536, 1920, 2400]

/**
 * srcSet widths for an image. Fixed-size images (no `sizes`) just need 1x/2x;
 * fluid images (`sizes` given) get a ladder spanning small→2× so the browser
 * can pick a smaller file on a smaller screen/container.
 */
function defaultWidths(width: number, fluid: boolean): number[] {
  if (!fluid) return [width, width * 2]
  const max = Math.min(width * 2, 4000)
  return [...DEVICE_WIDTHS, width, width * 2].filter((w) => w <= max)
}

/**
 * Width-descriptor `srcSet` for an Oztix URL, with `height` (if any) scaled
 * proportionally per entry. Returns `undefined` for non-Oztix URLs or no width.
 */
function buildSrcSet(
  src: string,
  width: number | undefined,
  widths: number[] | undefined,
  height: number | undefined,
  opts: OztixImageOptions
): string | undefined {
  if (width == null || width <= 0 || !isOztixImageUrl(src)) return undefined
  const ladder = [
    ...new Set(
      (widths ?? [width, width * 2]).map(Math.round).filter((w) => w > 0)
    )
  ].sort((a, b) => a - b)
  if (ladder.length === 0) return undefined
  return ladder
    .map((w) => {
      const h =
        height != null && height > 0
          ? Math.round(height * (w / width))
          : undefined
      return `${oztixImageAtWidth(src, w, { ...opts, height: h })} ${w}w`
    })
    .join(', ')
}

/** A breakpoint-specific `<source>` for art direction — a different URL/crop per media query. */
export type ImageSource = {
  /** `<source media>` query, e.g. `'(max-width: 767px)'`. */
  media: string
  /** Source URL. Defaults to the component's `src`. */
  src?: string
  /** 1x width for this source. Defaults to the component's `width`. */
  width?: number
  /** Crop height for this source. */
  height?: number
  /** Explicit srcSet ladder for this source. */
  widths?: number[]
  /** `<source sizes>`. Defaults to `${width}px`. */
  sizes?: string
  format?: OztixImageFormat
  quality?: number
  autotrim?: boolean
  params?: OztixImageOptions['params']
}

export type ImageProps = Omit<
  ComponentProps<'img'>,
  'width' | 'height' | 'src' | 'alt' | 'sizes'
> & {
  /** Image URL. Oztix-CDN hosts get the resize/transcode rewrite; everything else passes through. */
  src: string
  /** Alt text describing the image. Required. */
  alt: string
  /**
   * 1x render width in CSS pixels. Drives the default `srcSet`/`sizes` and
   * reserves layout. Omit to render a plain pass-through `<img>`.
   */
  width?: number
  /**
   * Target/intrinsic height. Reserves layout (via `aspect-ratio`) and, when set
   * alongside `width`, is sent to the proxy so it crops to both dimensions.
   */
  height?: number
  /** Explicit srcSet ladder. Defaults to `[width, width * 2]`. */
  widths?: number[]
  /**
   * `<img sizes>` describing how wide the image renders (e.g. `'100vw'`). Set it
   * for fluid images so Roadie builds a responsive ladder and small screens load
   * small files. Defaults to `${width}px` (fixed size).
   */
  sizes?: string
  /** Marks the image as LCP-critical: eager loading + `fetchpriority="high"`. */
  priority?: boolean
  /** Output format. Defaults to `webp`. */
  format?: OztixImageFormat
  /** Encoder quality, 1–100. Lower trades fidelity for bytes. */
  quality?: number
  /**
   * Crop surrounding transparent space server-side (ImageSharp `autotrim=1`).
   * Useful for logos padded with transparency. Takes effect with `width`.
   */
  autotrim?: boolean
  /**
   * Escape hatch for any other ImageSharp.Web command (`rmode`, `ranchor`,
   * `bgcolor`, etc.), merged verbatim. Takes effect with `width`.
   */
  params?: OztixImageOptions['params']
  /**
   * Blur-up placeholder: show a tiny low-quality preview, then fade the full
   * image in on load. `'blur'` wraps the image in a positioned element. The
   * preview is derived from the Oztix proxy by default; pass `blurDataURL` for
   * non-Oztix images or to override.
   */
  placeholder?: 'blur' | 'empty'
  /** Explicit preview source for `placeholder='blur'`. Required for non-Oztix images. */
  blurDataURL?: string
  /**
   * Art direction: render a `<picture>` with a `<source>` per breakpoint, each
   * able to use a different URL/crop. The component `src` stays the fallback
   * `<img>`. Each entry inherits `format`/`quality`/`autotrim`/`params`/`width`
   * unless it overrides them.
   */
  sources?: ImageSource[]
  /**
   * Defer loading until the image nears the viewport via IntersectionObserver.
   * Use inside horizontally-scrolled surfaces (e.g. Carousel) where native
   * `loading='lazy'` over-fetches. Ignored when `priority` is set.
   */
  defer?: boolean
}

const LQIP_WIDTH = 24
const LQIP_QUALITY = 30
const FADE = 'opacity 400ms ease'

export function Image({
  ref,
  src,
  alt,
  width,
  height,
  widths,
  sizes,
  priority = false,
  format,
  quality,
  autotrim,
  params,
  placeholder = 'empty',
  blurDataURL,
  sources,
  defer = false,
  loading,
  fetchPriority,
  decoding,
  className,
  style,
  onLoad,
  ...props
}: ImageProps) {
  const deferred = defer && !priority
  const [visible, setVisible] = useState(!deferred)
  const [loaded, setLoaded] = useState(false)
  const innerRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (visible) return
    if (!deferred) {
      setVisible(true)
      return
    }
    const el = innerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, deferred])

  const opts: OztixImageOptions = { format, quality, autotrim, params }
  const sized = width != null && width > 0

  const mainWidths =
    widths ?? (sized && sizes != null ? defaultWidths(width, true) : undefined)
  const srcSet = buildSrcSet(src, width, mainWidths, height, opts)
  const resolvedSrc = sized
    ? oztixImageAtWidth(src, width, { ...opts, height })
    : src
  const resolvedSizes = srcSet ? (sizes ?? `${width}px`) : sizes
  const aspectRatio =
    sized && height != null && height > 0 ? `${width} / ${height}` : undefined

  const wantsBlur = placeholder === 'blur'
  const lqip = wantsBlur
    ? (blurDataURL ??
      (isOztixImageUrl(src)
        ? oztixImageAtWidth(src, LQIP_WIDTH, {
            format,
            quality: LQIP_QUALITY,
            autotrim
          })
        : undefined))
    : undefined

  // Cached images can finish loading before React attaches onLoad, so the fade
  // and tint removal would never fire — reconcile from the element's own
  // complete flag.
  useEffect(() => {
    if (innerRef.current?.complete && innerRef.current.currentSrc)
      setLoaded(true)
  }, [resolvedSrc, visible])

  const img = (
    <img
      ref={(node) => {
        innerRef.current = node
        setRef(ref, node)
      }}
      data-slot='image'
      alt={alt}
      src={visible ? resolvedSrc : undefined}
      srcSet={visible ? srcSet : undefined}
      sizes={resolvedSizes}
      width={width}
      height={height}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      fetchPriority={priority ? 'high' : fetchPriority}
      decoding={decoding ?? 'async'}
      onLoad={(event) => {
        setLoaded(true)
        onLoad?.(event)
      }}
      className={lqip ? undefined : cn(!loaded && 'bg-subtle', className)}
      style={
        lqip
          ? {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: loaded ? 1 : 0,
              transition: FADE
            }
          : aspectRatio
            ? { aspectRatio, ...style }
            : style
      }
      {...props}
    />
  )

  const sourceEls = sources?.map((source, i) => {
    const sSrc = source.src ?? src
    const sWidth = source.width ?? width
    const sHeight = source.height ?? height
    const sOpts: OztixImageOptions = {
      format: source.format ?? format,
      quality: source.quality ?? quality,
      autotrim: source.autotrim ?? autotrim,
      params: source.params ?? params
    }
    const sWidths =
      source.widths ??
      (sWidth != null && sWidth > 0 && source.sizes != null
        ? defaultWidths(sWidth, true)
        : undefined)
    const set = buildSrcSet(sSrc, sWidth, sWidths, sHeight, sOpts)
    const single =
      sWidth != null && sWidth > 0
        ? oztixImageAtWidth(sSrc, sWidth, { ...sOpts, height: sHeight })
        : sSrc
    return (
      <source
        key={`${source.media}-${i}`}
        media={source.media}
        srcSet={visible ? (set ?? single) : undefined}
        sizes={source.sizes ?? (set ? `${sWidth}px` : undefined)}
        type={isOztixImageUrl(sSrc) ? MIME[sOpts.format ?? 'webp'] : undefined}
      />
    )
  })

  const visual =
    sourceEls && sourceEls.length > 0 ? (
      <picture>
        {sourceEls}
        {img}
      </picture>
    ) : (
      img
    )

  if (!lqip) return visual

  return (
    <span
      data-slot='image-blur'
      className={cn(!loaded && 'bg-subtle', className)}
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        aspectRatio,
        ...style
      }}
    >
      <span
        aria-hidden='true'
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${lqip}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(16px)',
          transform: 'scale(1.1)',
          opacity: loaded ? 0 : 1,
          transition: FADE
        }}
      />
      {visual}
    </span>
  )
}

Image.displayName = 'Image'
