'use client'

import { type CSSProperties, type ReactNode, useRef, useState } from 'react'

import {
  ArrowsHorizontalIcon,
  CaretDownIcon,
  PlusIcon,
  SplitVerticalIcon
} from '@phosphor-icons/react'

import type { TokenEntry } from '@/lib/tokens'

import { cn } from '@oztix/roadie-core/utils'

const tile = 'size-10 rounded-lg'

function Glyph({
  className,
  style,
  text = 'Ag',
  baseline
}: {
  className?: string
  style?: CSSProperties
  text?: string
  /** Sits the glyph bottom-left, so a size larger than the tile still reads. */
  baseline?: boolean
}) {
  const align = baseline
    ? 'items-end justify-items-start'
    : 'place-items-center'
  return (
    <span
      className={`grid size-12 overflow-hidden leading-none ${align} ${className ?? ''}`}
      style={style}
    >
      {text}
    </span>
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className={cn(tile, 'border border-subtler')}
      style={{ backgroundColor: color }}
    />
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className='grid size-10 place-items-center rounded-lg bg-subtle text-subtle [&_svg]:size-5'>
      {children}
    </span>
  )
}

/** A button that toggles a dot across a track, timed by the token. */
function Travel({ style }: { style: CSSProperties }) {
  const [end, setEnd] = useState(false)
  return (
    <button
      type='button'
      aria-label='Play'
      onClick={() => setEnd((value) => !value)}
      className='is-interactive grid h-10 w-12 items-center rounded-lg emphasis-sunken px-1.5'
    >
      <span
        className={cn(
          'size-3 rounded-full bg-strong transition-transform',
          end && 'translate-x-6'
        )}
        style={style}
      />
    </button>
  )
}

/** A button that replays an animation or an enter transition. */
function Replay({
  className,
  style,
  transition,
  attributes
}: {
  className?: string
  style?: CSSProperties
  transition?: boolean
  attributes?: Record<string, string>
}) {
  const [run, setRun] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  const play = () => {
    const element = ref.current
    if (!transition || !element) return setRun((count) => count + 1)
    element.style.transition = 'none'
    element.setAttribute('data-starting-style', '')
    void element.offsetWidth
    element.style.transition = ''
    element.removeAttribute('data-starting-style')
  }

  return (
    <button
      type='button'
      aria-label='Play'
      onClick={play}
      className='is-interactive grid size-12 place-items-center overflow-hidden rounded-lg emphasis-sunken'
    >
      <span
        key={run}
        ref={ref}
        className={cn('size-6 emphasis-strong rounded-md', className)}
        style={style}
        {...attributes}
      />
    </button>
  )
}

const v = (name: string) => `var(${name})`

function variablePreview({ name, group, family, classes, value }: TokenEntry) {
  switch (group) {
    case 'Accent parameters':
      return (
        <Swatch color='oklch(0.639 var(--accent-chroma) var(--accent-hue))' />
      )
    case 'Hue':
      return <Swatch color='oklch(0.65 0.15 var(--intent-hue))' />
    case 'Semantic utilities': {
      const utility = classes?.[0] ?? ''
      if (utility.startsWith('text-')) return <Glyph className={utility} />
      if (utility.startsWith('border-'))
        return <span className={cn(tile, 'border-2', utility)} />
      return <span className={cn(tile, 'border border-subtler', utility)} />
    }
    case 'Text':
      return <Glyph style={{ color: v(name) }} />
    case 'Borders':
      return (
        <span
          className={cn(tile, 'border-2')}
          style={{ borderColor: v(name) }}
        />
      )
    case 'Focus ring':
      return (
        <span
          className='size-8 rounded-lg bg-raised'
          style={{
            outline: `var(--focus-ring-width) solid color-mix(in oklch, var(--intent-9) var(--focus-ring-opacity), transparent)`
          }}
        />
      )
    case 'Shadows':
      return name.startsWith('--inset') ? (
        <span
          className={cn(tile, 'bg-sunken')}
          style={{ boxShadow: v(name) }}
        />
      ) : (
        <span
          className={cn(tile, 'bg-raised')}
          style={{ boxShadow: v(name) }}
        />
      )
    case 'Rim light':
      return (
        <span
          className={cn(tile, 'bg-strong')}
          style={{
            boxShadow:
              name === '--rim-light-edge'
                ? `inset 0 1px 0 0 ${v(name)}`
                : v(name)
          }}
        />
      )
    case 'Layering':
      return (
        <span className='grid size-10 place-items-center rounded-lg bg-subtle font-mono text-sm text-strong'>
          {value?.light}
        </span>
      )
    case 'Font families':
      return <Glyph className='text-2xl' style={{ fontFamily: v(name) }} />
    case 'Font sizes':
      return <Glyph baseline style={{ fontSize: v(name) }} />
    case 'Line heights':
      return (
        <span
          className='w-10 text-[0.5rem] text-subtle'
          style={{ lineHeight: v(name) }}
        >
          Line one line two line three
        </span>
      )
    case 'Letter spacing':
      return (
        <Glyph
          className='text-lg'
          style={{ letterSpacing: v(name) }}
          text='Aa'
        />
      )
    case 'Radius':
      return (
        <span
          className='size-10 border-s-2 border-t-2 border-strong bg-subtle'
          style={{ borderStartStartRadius: v(name) }}
        />
      )
    case 'Containers':
      return (
        <Icon>
          <ArrowsHorizontalIcon weight='bold' />
        </Icon>
      )
    case 'Durations':
      return <Travel style={{ transitionDuration: v(name) }} />
    case 'Easings':
      return (
        <Travel
          style={{
            transitionDuration: '600ms',
            transitionTimingFunction: v(name)
          }}
        />
      )
    case 'Font size line heights':
    case 'Stagger':
      return null
  }
  return family === 'color-scales' || family === 'intents' ? (
    <Swatch color={v(name)} />
  ) : null
}

const TRANSITIONS = new Set(['motion-scale', 'motion-slide', 'motion-drawer'])

function utilityPreview({ name, family, group }: TokenEntry) {
  switch (family) {
    case 'intents':
      return <span className={cn(tile, 'emphasis-strong rounded-full', name)} />
    case 'emphasis':
      if (name === 'is-translucent')
        return (
          <span className='grid size-12 place-items-center rounded-lg bg-[repeating-linear-gradient(45deg,var(--intent-7)_0_4px,transparent_4px_8px)]'>
            <span className='size-8 emphasis-raised rounded-md is-translucent' />
          </span>
        )
      if (group === 'Interaction states')
        return name === 'is-interactive' ? (
          <span className='is-interactive emphasis-normal rounded-full px-2 py-1 text-xs'>
            Tap
          </span>
        ) : (
          <span className='is-interactive-field h-8 w-12 rounded-lg emphasis-field' />
        )
      return <span className={cn(tile, name)} />
    case 'elevation':
      return name === 'rim-light' ? (
        <span className={cn(tile, 'bg-strong', name)} />
      ) : (
        <span
          className={cn(
            tile,
            name.startsWith('inset') ? 'bg-sunken' : 'bg-raised',
            name
          )}
        />
      )
    case 'typography':
      return <Glyph baseline className={name} />
    case 'motion':
      return TRANSITIONS.has(name) ? (
        <Replay
          className={name}
          transition
          attributes={
            name === 'motion-drawer'
              ? { 'data-swipe-direction': 'down' }
              : undefined
          }
        />
      ) : (
        <Replay className={name} />
      )
    case 'shape':
      return (
        <Icon>
          <ArrowsHorizontalIcon weight='bold' />
        </Icon>
      )
    case 'component-utilities':
      if (name.startsWith('calendar-tile'))
        return (
          <span
            aria-hidden
            className='calendar-tile calendar-tile-sm emphasis-subtle intent-accent'
          >
            <span className='calendar-tile-top'>Nov</span>
            <span className='calendar-tile-day'>27</span>
          </span>
        )
      return (
        <span
          className={cn(
            'btn origin-center scale-75 emphasis-strong',
            name === 'btn' ? 'btn-sm' : name
          )}
        >
          {name.startsWith('btn-icon') ? <PlusIcon weight='bold' /> : 'Go'}
        </span>
      )
  }
  return null
}

/** A live sample of a token, drawn with the token itself. */
export function TokenPreview({ token }: { token: TokenEntry }) {
  switch (token.kind) {
    case 'variable':
      return variablePreview(token)
    case 'utility':
      return utilityPreview(token)
    case 'keyframes':
      return (
        <Replay
          style={{
            animation: `${token.name} var(--duration-slowest) var(--ease-standard)`
          }}
        />
      )
    case 'variant':
      return (
        <Icon>
          <SplitVerticalIcon weight='bold' />
        </Icon>
      )
    case 'class':
      return (
        <Icon>
          <CaretDownIcon weight='bold' />
        </Icon>
      )
  }
}
