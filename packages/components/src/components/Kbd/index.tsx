'use client'

import { type ComponentProps, Fragment, type ReactNode } from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type KeyFace, keyFace } from './keys'
import { type KeyPlatform, useKeyPlatform } from './platform'

// A touch screen has no keyboard to hint at, unless a container opts in.
const HIDE_WITHOUT_HOVER =
  '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'

// Without color-mix the fill drops out rather than painting over the label.
const kbdVariants = cva(
  'inline-flex items-center justify-center gap-1 font-sans text-xs whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-normal rounded-md font-medium',
        subtle:
          'rounded-md bg-[color-mix(in_oklch,currentColor_10%,transparent)] font-medium',
        subtler: 'tracking-wide'
      },
      size: { sm: '', md: '' }
    },
    compoundVariants: [
      { emphasis: ['normal', 'subtle'], size: 'sm', class: 'h-5 min-w-5 px-1' },
      {
        emphasis: ['normal', 'subtle'],
        size: 'md',
        class: 'h-6 min-w-6 px-1.5'
      }
    ],
    defaultVariants: { emphasis: 'subtle', size: 'md' }
  }
)

export type KbdProps = ComponentProps<'kbd'> & {
  /** A combination: `['mod', 'k']`. Overrides `children`. */
  keys?: readonly string[]
  /**
   * Draws `keys` in one keycap, such as ⌘K, rather than a keycap each.
   * `subtler` keys have no keycap, so it changes nothing there.
   * @default false
   */
  combined?: boolean
  /**
   * `subtle` is a soft keycap tinted from the surrounding text colour; on a
   * strong fill with an intent, use `subtler`. `normal` is its own bordered
   * surface and keeps its own colours on any fill. `subtler` is plain text in
   * the surrounding colour, for menus, tooltips and strong fills.
   * @default 'subtle'
   */
  emphasis?: 'normal' | 'subtle' | 'subtler'
  /** The keycap's height. Plain `subtler` text follows the font size instead. @default 'md' */
  size?: 'sm' | 'md'
  /**
   * Read the keys aloud, by name. Off by default: a control carries its
   * shortcut in `aria-keyshortcuts`, so the hint is visual. Turn it on where
   * the keys are the content, such as instructions in prose. Announced keys
   * also stay on touch screens.
   * @default false
   */
  announce?: boolean
}

type KeyCapProps = {
  face: KeyFace
  announce: boolean
}

function KeyCapContent({ face, announce }: KeyCapProps) {
  const { glyph: Glyph, label, name, pending } = face
  const visible = (
    <>
      {Glyph ? <Glyph weight='bold' aria-hidden='true' /> : null}
      {label ? <span>{label}</span> : null}
    </>
  )
  if (pending) return <span className='invisible inline-flex'>{visible}</span>
  if (!announce) return visible
  return (
    <>
      <span aria-hidden='true' className='inline-flex items-center gap-1'>
        {visible}
      </span>
      <span className='sr-only'>{name}</span>
    </>
  )
}

function capContent(
  children: ReactNode,
  platform: KeyPlatform | null,
  announce: boolean
) {
  if (typeof children !== 'string') return children
  return (
    <KeyCapContent face={keyFace(children, platform)} announce={announce} />
  )
}

type KeyListProps = {
  keys: readonly string[]
  platform: KeyPlatform | null
  announce: boolean
  plus: boolean
  slot: 'kbd' | 'kbd-key'
  className: string
}

function KeyList({
  keys,
  platform,
  announce,
  plus,
  slot,
  className
}: KeyListProps) {
  return keys.map((key, index) => (
    <Fragment key={`${index}-${key}`}>
      {plus && index > 0 ? (
        <span
          data-slot='kbd-plus'
          aria-hidden='true'
          className={cn('text-xs', platform ? undefined : 'invisible')}
        >
          +
        </span>
      ) : null}
      <kbd data-slot={slot} className={className}>
        {capContent(key, platform, announce)}
      </kbd>
    </Fragment>
  ))
}

export function Kbd({
  keys,
  combined = false,
  emphasis = 'subtle',
  size = 'md',
  announce = false,
  className,
  children,
  ...props
}: KbdProps) {
  const platform = useKeyPlatform()
  const hidden = announce ? undefined : true
  const hideWithoutHover = announce ? undefined : HIDE_WITHOUT_HOVER
  const plain = emphasis === 'subtler'
  // Keys that share a run read Ctrl+D off Apple, not CtrlD.
  const plus = (plain || combined) && platform !== 'apple'

  if (keys && combined && !plain) {
    return (
      <kbd
        data-slot='kbd'
        aria-hidden={hidden}
        className={cn(
          kbdVariants({ emphasis, size }),
          'gap-0.5',
          hideWithoutHover,
          className
        )}
        {...props}
      >
        <KeyList
          keys={keys}
          platform={platform}
          announce={announce}
          plus={plus}
          slot='kbd-key'
          className='inline-flex items-center gap-1 font-sans'
        />
      </kbd>
    )
  }

  if (keys) {
    return (
      <kbd
        data-slot='kbd-group'
        aria-hidden={hidden}
        className={cn(
          'inline-flex items-center',
          plain ? 'gap-0.5' : 'gap-1',
          hideWithoutHover,
          className
        )}
        {...props}
      >
        <KeyList
          keys={keys}
          platform={platform}
          announce={announce}
          plus={plus}
          slot='kbd'
          className={kbdVariants({ emphasis, size })}
        />
      </kbd>
    )
  }

  return (
    <kbd
      data-slot='kbd'
      aria-hidden={hidden}
      className={cn(
        kbdVariants({ emphasis, size }),
        hideWithoutHover,
        className
      )}
      {...props}
    >
      {capContent(children, platform, announce)}
    </kbd>
  )
}

Kbd.displayName = 'Kbd'
