'use client'

import { useEffect, useRef } from 'react'

import type { HeroVideoSource } from '.'
import { useReducedMotion } from './useReducedMotion'

const AV1 = 'video/mp4; codecs=av01.0.05M.08'

/** A muted, looping clip that plays on its own, and stays on its poster for viewers who reduce motion. */
export function HeroVideo({ src, fallbackSrc, poster }: HeroVideoSource) {
  const ref = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) ref.current?.pause()
  }, [reducedMotion])

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={poster.src}
      aria-label={poster.alt}
      className='absolute inset-0 size-full object-cover'
    >
      <source src={src} type={fallbackSrc ? AV1 : undefined} />
      {fallbackSrc && <source src={fallbackSrc} type='video/mp4' />}
    </video>
  )
}
