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

export type ImageProps = Omit<
  ComponentProps<'img'>,
  'width' | 'height' | 'src'
> & {
  /** Image URL. Oztix-CDN hosts get the resize/transcode rewrite; everything else passes through. */
  src: string
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

  let srcSet: string | undefined
  if (sized && isOztixImageUrl(src)) {
    const ladder = [
      ...new Set(
        (widths ?? [width, width * 2]).map(Math.round).filter((w) => w > 0)
      )
    ].sort((a, b) => a - b)
    if (ladder.length > 0)
      srcSet = ladder
        .map((w) => {
          const h =
            height != null && height > 0
              ? Math.round(height * (w / width))
              : undefined
          return `${oztixImageAtWidth(src, w, { ...opts, height: h })} ${w}w`
        })
        .join(', ')
  }

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
  // would never fire — reconcile from the element's own complete flag.
  useEffect(() => {
    if (lqip && innerRef.current?.complete) setLoaded(true)
  }, [lqip, resolvedSrc, visible])

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
      className={lqip ? undefined : cn('bg-subtle', className)}
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

  if (!lqip) return img

  return (
    <span
      data-slot='image-blur'
      className={cn('bg-subtle', className)}
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
      {img}
    </span>
  )
}

Image.displayName = 'Image'
