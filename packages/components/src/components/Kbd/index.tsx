'use client'

import { type ComponentProps, Fragment, type ReactNode } from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type KeyFace, keyFace } from './keys'
import { type KeyPlatform, useKeyPlatform } from './platform'

// A touch screen has no keyboard to hint at.
const HIDE_WITHOUT_HOVER = '[@media_not_(hover:hover)]:hidden'

// Tinted from the inherited colour, so a keycap reads on any surface,
// strong fills and tooltips included.
const kbdVariants = cva(
  'inline-flex items-center justify-center gap-1 font-sans text-xs whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      emphasis: {
        normal: 'rounded-md border border-current/15 bg-current/10 font-medium',
        subtler: 'tracking-wide'
      },
      size: { sm: '', md: '' }
    },
    compoundVariants: [
      { emphasis: 'normal', size: 'sm', class: 'h-5 min-w-5 px-1' },
      { emphasis: 'normal', size: 'md', class: 'h-6 min-w-6 px-1.5' }
    ],
    defaultVariants: { emphasis: 'normal', size: 'md' }
  }
)

export type KbdProps = ComponentProps<'kbd'> & {
  /** A combination, each key its own keycap: `['mod', 'k']`. Overrides `children`. */
  keys?: readonly string[]
  /** `normal` is a keycap; `subtler` is plain text, for menus. Both take the surrounding text colour. @default 'normal' */
  emphasis?: 'normal' | 'subtler'
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

export function Kbd({
  keys,
  emphasis = 'normal',
  size = 'md',
  announce = false,
  className,
  children,
  ...props
}: KbdProps) {
  const platform = useKeyPlatform()
  const hidden = announce ? undefined : true
  const hideWithoutHover = announce ? undefined : HIDE_WITHOUT_HOVER
  // Plain keys run together off Apple, where shortcuts read Ctrl+D, not CtrlD.
  const joined = emphasis === 'subtler' && platform !== 'apple'

  if (keys) {
    return (
      <kbd
        data-slot='kbd-group'
        aria-hidden={hidden}
        className={cn(
          'inline-flex items-center',
          emphasis === 'normal' ? 'gap-1' : 'gap-0.5',
          hideWithoutHover,
          className
        )}
        {...props}
      >
        {keys.map((key, index) => (
          <Fragment key={`${index}-${key}`}>
            {joined && index > 0 ? (
              <span
                data-slot='kbd-plus'
                aria-hidden='true'
                className={cn('text-xs', platform ? undefined : 'invisible')}
              >
                +
              </span>
            ) : null}
            <kbd data-slot='kbd' className={kbdVariants({ emphasis, size })}>
              {capContent(key, platform, announce)}
            </kbd>
          </Fragment>
        ))}
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
