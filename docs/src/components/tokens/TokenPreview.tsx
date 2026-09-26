'use client'

import { type CSSProperties, useRef, useState } from 'react'

import {
  CaretRightIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@phosphor-icons/react'

import type { TokenEntry } from '@/lib/tokens'

import { cn } from '@oztix/roadie-core/utils'

const tile = 'size-10 rounded-lg'

/** The literal value: Tailwind drops `@theme` variables no class reads, so `var()` may not exist. */
const literal = (token: TokenEntry) =>
  token.resolved?.light ?? token.value?.light ?? ''

const v = (name: string) => `var(${name})`

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
      style={{ background: color }}
    />
  )
}

/** A dot that crosses a track on each press, timed by the token. */
function Travel({ duration, easing }: { duration: string; easing: string }) {
  const [end, setEnd] = useState(false)
  return (
    <button
      type='button'
      aria-label='Play'
      aria-pressed={end}
      onClick={() => setEnd((value) => !value)}
      className='is-interactive grid h-10 w-12 items-center rounded-lg emphasis-sunken px-1.5'
    >
      <span
        className='size-3 rounded-full bg-strong'
        style={{
          transitionProperty: 'translate',
          transitionDuration: duration,
          transitionTimingFunction: easing,
          translate: end ? '1.5rem 0' : '0 0'
        }}
      />
    </button>
  )
}

/** Remounts a sample on each press, so its animation plays again. */
function Replay({
  className,
  style
}: {
  className?: string
  style?: CSSProperties
}) {
  const [run, setRun] = useState(0)
  return (
    <button
      type='button'
      aria-label='Play'
      onClick={() => setRun((count) => count + 1)}
      className='is-interactive grid size-12 place-items-center overflow-hidden rounded-lg emphasis-sunken'
    >
      <span
        key={run}
        className={cn('size-6 emphasis-strong rounded-md', className)}
        style={style}
      />
    </button>
  )
}

/** Plays an enter/exit utility as Base UI drives it, through `data-starting-style` and `data-ending-style`. */
function EnterExit({
  className,
  attributes
}: {
  className: string
  attributes?: Record<string, string>
}) {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLSpanElement>(null)

  const toggle = () => {
    const element = ref.current
    if (!element) return
    if (open) {
      element.setAttribute('data-ending-style', '')
    } else {
      element.style.transition = 'none'
      element.removeAttribute('data-ending-style')
      element.setAttribute('data-starting-style', '')
      void element.offsetWidth
      element.style.transition = ''
      requestAnimationFrame(() =>
        element.removeAttribute('data-starting-style')
      )
    }
    setOpen(!open)
  }

  return (
    <button
      type='button'
      aria-label={open ? 'Play exit' : 'Play enter'}
      onClick={toggle}
      className='is-interactive grid size-12 place-items-center overflow-hidden rounded-lg emphasis-sunken'
    >
      <span
        ref={ref}
        className={cn('size-8 emphasis-strong rounded-md', className)}
        {...attributes}
      />
    </button>
  )
}

function Disclosure() {
  return (
    <details className='is-disclosure-animated w-12 rounded-lg emphasis-sunken text-xs'>
      <summary className='is-interactive grid h-10 cursor-pointer list-none place-items-center rounded-lg [&::-webkit-details-marker]:hidden'>
        <CaretRightIcon weight='bold' className='size-4' aria-hidden />
        <span className='sr-only'>Toggle</span>
      </summary>
      <span className='block px-1.5 pb-1.5 text-subtle'>Open</span>
    </details>
  )
}

function FocusRing({
  width,
  opacity,
  dark
}: {
  width: string
  opacity: string
  dark?: boolean
}) {
  return (
    <span
      className={cn(
        'grid size-12 place-items-center rounded-lg',
        dark && 'dark bg-normal'
      )}
    >
      <span
        className='size-7 rounded-md bg-raised'
        style={{
          outline: `${width} solid color-mix(in oklch, var(--intent-9) ${opacity}, transparent)`
        }}
      />
    </span>
  )
}

function CalendarTile({
  size,
  part
}: {
  size?: 'sm' | 'lg'
  part?: 'top' | 'day'
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'calendar-tile emphasis-subtle intent-accent',
        size && `calendar-tile-${size}`
      )}
    >
      <span className={cn('calendar-tile-top', part === 'day' && 'opacity-25')}>
        Nov
      </span>
      <span className={cn('calendar-tile-day', part === 'top' && 'opacity-25')}>
        27
      </span>
    </span>
  )
}

function variablePreview(token: TokenEntry) {
  const { name, group, family, value } = token
  switch (group) {
    case 'Accent parameters':
      return name === '--accent-hue' ? (
        <Swatch color='oklch(0.7 0.15 var(--accent-hue))' />
      ) : (
        <Swatch color='linear-gradient(90deg, oklch(0.64 0 var(--accent-hue)), oklch(0.64 var(--accent-chroma) var(--accent-hue)))' />
      )
    case 'Hue':
      return <Swatch color='oklch(0.65 0.15 var(--intent-hue))' />
    case 'Semantic utilities': {
      const utility = token.classes?.[0] ?? ''
      if (utility.startsWith('text-')) return <Glyph className={utility} />
      if (utility.startsWith('border-'))
        return <span className={cn(tile, 'border-2', utility)} />
      return <span className={cn(tile, 'border border-subtler', utility)} />
    }
    case 'Text':
      return <Glyph style={{ color: v(name) }} />
    case 'Mark':
      return name.endsWith('-text') ? (
        <Glyph
          style={{ color: v(name), background: 'var(--intent-mark-bg)' }}
        />
      ) : (
        <Swatch color={v(name)} />
      )
    case 'Borders':
      return (
        <span
          className={cn(tile, 'border-2')}
          style={{ borderColor: v(name) }}
        />
      )
    case 'Focus ring':
      if (name === '--focus-ring-width')
        return <FocusRing width={literal(token)} opacity='100%' />
      return name.endsWith('-dark') ? (
        <FocusRing width='4px' opacity={literal(token)} dark />
      ) : (
        <FocusRing width='4px' opacity={literal(token)} />
      )
    case 'Shadows':
      return (
        <span className='grid size-12 place-items-center rounded-lg bg-subtle'>
          <span
            className={cn(
              'size-8 rounded-md',
              name.startsWith('--inset') ? 'bg-sunken' : 'bg-raised'
            )}
            style={{ boxShadow: v(name) }}
          />
        </span>
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
    case 'Font families':
      return value?.light?.startsWith('var(') ? null : (
        <Glyph className='text-2xl' style={{ fontFamily: literal(token) }} />
      )
    case 'Font sizes':
      return <Glyph baseline style={{ fontSize: literal(token) }} />
    case 'Line heights':
      return (
        <span
          className='w-10 text-[0.5rem] text-subtle'
          style={{ lineHeight: literal(token) }}
        >
          Line one line two line three
        </span>
      )
    case 'Letter spacing':
      return (
        <Glyph
          className='text-lg'
          style={{ letterSpacing: literal(token) }}
          text='Aa'
        />
      )
    case 'Radius':
      return (
        <span
          className='size-10 border-s-2 border-t-2 border-strong bg-subtle'
          style={{ borderStartStartRadius: literal(token) }}
        />
      )
    case 'Durations':
      return <Travel duration={literal(token)} easing='ease-in-out' />
    case 'Easings':
      return <Travel duration='600ms' easing={literal(token)} />
    case 'Chart ink':
      if (name === '--chart-label' || name === '--chart-value')
        return <Glyph style={{ color: v(name) }} />
      break
    // @theme inline never emits these, so read the token they alias.
    case 'Tailwind utilities':
      return <Swatch color={v(name.replace('--color-', '--'))} />
  }
  return family === 'color-scales' ||
    family === 'intents' ||
    family === 'dataviz' ? (
    <Swatch color={v(name)} />
  ) : null
}

/** Attributes a transition keys on beyond Base UI's starting and ending styles. */
const ENTER_EXIT_ATTRIBUTES: Record<string, Record<string, string>> = {
  'motion-drawer': { 'data-swipe-direction': 'down' }
}

function utilityPreview({ name, family, group, kind }: TokenEntry) {
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
      if (name === 'is-interactive')
        return (
          <button
            type='button'
            className='is-interactive emphasis-normal rounded-full px-2 py-1 text-xs'
          >
            Tap
          </button>
        )
      if (name === 'is-interactive-field')
        return (
          <input
            aria-label='Sample field'
            placeholder='Type'
            className='is-interactive-field h-8 w-12 rounded-lg emphasis-field px-1.5 text-xs'
          />
        )
      if (name === 'is-interactive-field-group')
        return (
          <span className='is-interactive-field-group flex h-8 w-12 items-center gap-0.5 rounded-lg emphasis-field px-1'>
            <MagnifyingGlassIcon weight='bold' className='size-3 shrink-0' />
            <input
              aria-label='Sample grouped field'
              className='w-full min-w-0 bg-transparent text-xs outline-none'
            />
          </span>
        )
      return group === 'Emphasis presets' ? (
        <span className={cn(tile, name)} />
      ) : null
    case 'elevation':
      return name === 'rim-light' ? (
        <span className={cn(tile, 'bg-strong', name)} />
      ) : (
        <span className='grid size-12 place-items-center rounded-lg bg-subtle'>
          <span
            className={cn(
              'size-8 rounded-md',
              name.startsWith('inset') ? 'bg-sunken' : 'bg-raised',
              name
            )}
          />
        </span>
      )
    case 'typography':
      return <Glyph baseline className={name} />
    case 'motion':
      if (kind === 'class') return <Disclosure />
      if (name === 'animate-indeterminate')
        return (
          <span className='relative h-1.5 w-12 overflow-hidden rounded-full bg-(--intent-4)'>
            <span className={cn('bg-strong', name)} />
          </span>
        )
      return group === 'Enter and exit transitions' ? (
        <EnterExit className={name} attributes={ENTER_EXIT_ATTRIBUTES[name]} />
      ) : (
        <Replay className={name} />
      )
    case 'component-utilities':
      if (name.startsWith('calendar-tile')) {
        const variant = name.replace('calendar-tile', '').replace('-', '')
        if (variant === 'sm' || variant === 'lg')
          return <CalendarTile size={variant} />
        if (variant === 'top' || variant === 'day')
          return <CalendarTile part={variant} />
        return <CalendarTile />
      }
      if (name === 'btn')
        return <span className='btn btn-md emphasis-strong'>Go</span>
      return (
        <span className={cn('btn emphasis-strong', name)}>
          {name.startsWith('btn-icon') ? <PlusIcon weight='bold' /> : 'Go'}
        </span>
      )
  }
  return null
}

/** A live sample of a token, drawn with the token itself, or nothing when a sample can't say more than the value. */
export function TokenPreview({ token }: { token: TokenEntry }) {
  switch (token.kind) {
    case 'variable':
      return variablePreview(token)
    case 'utility':
    case 'class':
      return utilityPreview(token)
    case 'keyframes':
      return (
        <Replay
          style={{
            animation: `${token.name} 600ms cubic-bezier(0.4, 0, 0.2, 1)`
          }}
        />
      )
    case 'variant':
      return null
  }
}
