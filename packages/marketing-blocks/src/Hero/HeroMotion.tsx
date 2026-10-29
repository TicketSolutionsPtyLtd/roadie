'use client'

import { type ReactNode, createContext, use, useState } from 'react'

import { PauseIcon, PlayIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '@oztix/roadie-components/button'

import { useReducedMotion } from './useReducedMotion'

type HeroMotion = { moving: boolean; toggle: () => void }

const HeroMotionContext = createContext<HeroMotion>({
  moving: false,
  toggle: () => {}
})

/** Whether the bento's video and photos move: the viewer's choice, else their motion preference. */
export function HeroMotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const moving = chosen ?? !reducedMotion
  return (
    <HeroMotionContext value={{ moving, toggle: () => setChosen(!moving) }}>
      {children}
    </HeroMotionContext>
  )
}

export function useHeroMotion(): HeroMotion {
  return use(HeroMotionContext)
}

/** Stops and starts everything that moves in the bento, for WCAG 2.2.2. */
export function HeroMotionToggle({ className }: { className?: string }) {
  const { moving, toggle } = useHeroMotion()
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={moving ? 'Pause video and photos' : 'Play video and photos'}
      aria-pressed={!moving}
      onClick={toggle}
    >
      {moving ? (
        <PauseIcon weight='bold' className='size-4' />
      ) : (
        <PlayIcon weight='bold' className='size-4' />
      )}
    </IconButton>
  )
}
