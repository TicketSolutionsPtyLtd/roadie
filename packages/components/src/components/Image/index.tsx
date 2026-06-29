'use client'

import { type ComponentProps, useEffect, useRef, useState } from 'react'

import {
  type OztixImageFormat,
  oztixImageAtWidth,
  oztixSrcSet
} from '@oztix/roadie-core/image'

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
  /** Intrinsic / 1x render height. Reserves layout to avoid shift before load. */
  height?: number
  /** Explicit srcSet ladder. Defaults to `[width, width * 2]`. */
  widths?: number[]
  /** Marks the image as LCP-critical: eager loading + `fetchpriority="high"`. */
  priority?: boolean
  /** Output format. Defaults to `webp`. */
  format?: OztixImageFormat
  /**
   * Defer loading until the image nears the viewport via IntersectionObserver.
   * Use inside horizontally-scrolled surfaces (e.g. Carousel) where native
   * `loading='lazy'` over-fetches. Ignored when `priority` is set.
   */
  defer?: boolean
}

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
  defer = false,
  loading,
  fetchPriority,
  decoding,
  style,
  ...props
}: ImageProps) {
  const deferred = defer && !priority
  const [visible, setVisible] = useState(!deferred)
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

  const sized = width != null && width > 0
  const ladder = sized ? (widths ?? [width, width * 2]) : undefined
  const srcSet = ladder ? oztixSrcSet(src, ladder, { format }) : undefined
  const resolvedSrc = sized ? oztixImageAtWidth(src, width, { format }) : src
  const resolvedSizes = srcSet ? (sizes ?? `${width}px`) : sizes

  const aspectRatio =
    sized && height != null && height > 0 ? `${width} / ${height}` : undefined

  return (
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
      style={aspectRatio ? { aspectRatio, ...style } : style}
      {...props}
    />
  )
}

Image.displayName = 'Image'
