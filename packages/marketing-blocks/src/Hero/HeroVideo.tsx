'use client'

import { useEffect, useRef, useState } from 'react'

import type { HeroVideoSource } from '.'
import { BlockImg } from '../_shared/BlockImg'
import { useHeroMotion } from './HeroMotion'

const AV1 = 'video/mp4; codecs=av01.0.05M.08'

/**
 * A muted, looping clip that plays while the hero's motion is on. It starts
 * from an effect rather than `autoPlay`, so it never plays before hydration
 * has read the viewer's motion preference. The poster is an image rather than the video's
 * `poster` attribute, so the provider's `renderImage` draws it.
 */
export function HeroVideo({
  src,
  fallbackSrc,
  poster,
  sizes
}: HeroVideoSource & { sizes: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { moving } = useHeroMotion()
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (moving) void video.play()?.catch(() => {})
    else video.pause()
  }, [moving])

  // The poster sits over the video until it first plays, since a video that
  // hasn't played paints its own first frame; paused later, it keeps its frame.
  return (
    <>
      <video
        ref={ref}
        loop
        muted
        playsInline
        aria-label={poster.alt}
        onPlaying={() => setStarted(true)}
        className='absolute inset-0 size-full object-cover'
      >
        <source src={src} type={fallbackSrc ? AV1 : undefined} />
        {fallbackSrc && <source src={fallbackSrc} type='video/mp4' />}
      </video>
      <div
        data-slot='hero-video-poster'
        hidden={started}
        className='absolute inset-0'
      >
        <BlockImg
          image={{ ...poster, alt: '' }}
          sizes={sizes}
          className='size-full object-cover'
        />
      </div>
    </>
  )
}
