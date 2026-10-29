'use client'

import { useEffect, useRef } from 'react'

import type { HeroVideoSource } from '.'
import { BlockImg } from '../_shared/BlockImg'
import { useHeroMotion } from './HeroMotion'

const AV1 = 'video/mp4; codecs=av01.0.05M.08'

/**
 * A muted, looping clip that plays while the hero's motion is on. It starts
 * from an effect rather than `autoPlay`, so it never plays before hydration
 * has read the viewer's motion preference. The poster is an image under the video rather
 * than its `poster` attribute, so the provider's `renderImage` draws it.
 */
export function HeroVideo({
  src,
  fallbackSrc,
  poster,
  sizes
}: HeroVideoSource & { sizes: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { moving } = useHeroMotion()

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (moving) void video.play()?.catch(() => {})
    else video.pause()
  }, [moving])

  return (
    <>
      <BlockImg
        image={{ ...poster, alt: '' }}
        sizes={sizes}
        className='absolute inset-0 size-full object-cover'
      />
      <video
        ref={ref}
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
