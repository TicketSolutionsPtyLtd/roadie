'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { BlockImage } from '../Provider'
import { BlockImg } from '../_shared/BlockImg'
import { useReducedMotion } from './useReducedMotion'

export type ImageCyclerProps = {
  images: readonly BlockImage[]
  /** Milliseconds each image shows for. */
  interval: number
  sizes: string
}

const SLOTS = [0, 1] as const

/**
 * Crossfades through images in two stacked slots while it's on screen, so at
 * most two load at once. Holds the first image for viewers who reduce motion.
 */
export function ImageCycler({ images, interval, sizes }: ImageCyclerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  const reducedMotion = useReducedMotion()
  const cycles = images.length > 1 && !reducedMotion

  useEffect(() => {
    const element = ref.current
    if (!cycles || !element || typeof IntersectionObserver === 'undefined')
      return
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? false),
      { threshold: 0.1 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [cycles])

  useEffect(() => {
    if (!cycles || !onScreen) return
    const timer = setInterval(() => setStep((last) => last + 1), interval)
    return () => clearInterval(timer)
  }, [cycles, onScreen, interval])

  if (images.length === 0) return null

  return (
    <div ref={ref} className='absolute inset-0'>
      {SLOTS.map((slot) => {
        const active = step % 2 === slot
        // A slot keeps the image it last showed while it fades out; slot 1
        // starts on the second image so the first change is already loaded.
        const shown = Math.max(active ? step : step - 1, slot)
        const image = images[shown % images.length]!
        if (slot === 1 && !cycles) return null
        return (
          <BlockImg
            key={slot}
            image={{ ...image, alt: active ? image.alt : '' }}
            sizes={sizes}
            priority={slot === 0}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-slowest',
              active ? 'opacity-100' : 'opacity-0'
            )}
          />
        )
      })}
    </div>
  )
}
