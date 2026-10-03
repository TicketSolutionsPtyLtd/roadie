'use client'

import { type ComponentProps, Fragment, type ReactNode } from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type KeyFace, keyFace } from './keys'
import { type KeyPlatform, useKeyPlatform } from './platform'

// A touch screen has no keyboard to hint at, unless a container opts in.
const HIDE_WITHOUT_HOVER =
  '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'

const kbdVariants = cva(
  'inline-flex items-center justify-center gap-1 font-sans text-xs whitespace-nowrap [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-normal rounded-md font-medium',
        // Without color-mix the fill drops out rather than painting over the
        // label.
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
   * Placed between `keys`, such as `'+'` or `'then'`. By default nothing on
   * Apple devices, and off them a plus inside a combined keycap or between
   * subtler keys, as in Ctrl+K. Text such as `'then'` is read aloud when
   * `announce` is on; `null` or `false` removes the default.
   */
  separator?: ReactNode
  /**
   * `subtle` is a soft keycap tinted from the surrounding text colour.
   * `normal` is its own bordered surface and keeps its own colours on any
   * fill. `subtler` is plain text in the surrounding colour, for menus.
   * @default 'subtle'
   */
  emphasis?: 'normal' | 'subtle' | 'subtler'
  /** The keycap's height. `subtler` has no keycap, so it ignores size. @default 'md' */
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
      {Glyph ? (
        <Glyph weight='bold' aria-hidden='true' className='size-3' />
      ) : null}
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
  separator: ReactNode
  /** The platform default, hidden until the platform is known. */
  pending: boolean
  slot: 'kbd' | 'kbd-key'
  className: string
}

const isWord = (node: ReactNode) =>
  typeof node === 'string' && /\p{L}/u.test(node)

function KeyList({
  keys,
  platform,
  announce,
  separator,
  pending,
  slot,
  className
}: KeyListProps) {
  const spoken = announce && isWord(separator)
  const shown =
    separator != null &&
    separator !== false &&
    separator !== true &&
    separator !== ''
  return keys.map((key, index) => (
    <Fragment key={`${index}-${key}`}>
      {shown && index > 0 ? (
        <span
          data-slot='kbd-separator'
          aria-hidden={spoken ? undefined : 'true'}
          className={cn('text-xs', pending ? 'invisible' : undefined)}
        >
          {spoken ? ` ${separator} ` : separator}
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
  separator,
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
  const given = separator !== undefined
  const between = {
    separator: given ? separator : plus ? '+' : null,
    pending: !given && platform === null
  }

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
          {...between}
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
          {...between}
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
