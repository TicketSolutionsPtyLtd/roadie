'use client'

import { useEffect, useRef } from 'react'

import type { HeroVideoSource } from '.'
import { BlockImg } from '../_shared/BlockImg'
import { useReducedMotion } from './useReducedMotion'

const AV1 = 'video/mp4; codecs=av01.0.05M.08'

/**
 * A muted, looping clip that plays on its own, and stays on its poster for
 * viewers who reduce motion. The poster is an image under the video rather
 * than its `poster` attribute, so the provider's `renderImage` draws it.
 */
export function HeroVideo({ src, fallbackSrc, poster }: HeroVideoSource) {
  const ref = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()
  const pausedForMotion = useRef(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (reducedMotion) {
      video.pause()
      pausedForMotion.current = true
    } else if (pausedForMotion.current) {
      pausedForMotion.current = false
      void video.play()?.catch(() => {})
    }
  }, [reducedMotion])

  return (
    <>
      <BlockImg
        image={{ ...poster, alt: '' }}
        sizes='(min-width: 768px) 55vw, 100vw'
        className='absolute inset-0 size-full object-cover'
      />
      <video
        ref={ref}
        autoPlay
        loop
        muted
        playsInline
        aria-label={poster.alt}
        className='absolute inset-0 size-full object-cover'
      >
        <source src={src} type={fallbackSrc ? AV1 : undefined} />
        {fallbackSrc && <source src={fallbackSrc} type='video/mp4' />}
      </video>
    </>
  )
}
