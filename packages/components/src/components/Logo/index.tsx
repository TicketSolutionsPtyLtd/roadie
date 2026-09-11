import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'

const MARK_PATH =
  'M10.71 35.16C1.61 26.4 6.54 5.33 22.02 13.82c5.15 2.71 9.05 6.46 9.1 8a8 8 0 0 1-.3 2.56.95.95 0 0 1-1.05.63 1 1 0 0 1-.4-.16c-.97-.7-2.2-2-2.71-2.54-.55-.6-.96-1-1.52-1.54-2.33-2.31-7.18-7.14-11.81-4.32-3.55 2.16-3.44 6.5-3.39 8.35.16 5.93 8.66 11.67 11.93 13.38 17.97 9.33 32.46-9.71 23.3-24.73C40.54 5.83 32.38.3 22.65.51l.02 3.16c4.68 1.24 10.34 4.9 13.88 8.3a15.1 15.1 0 0 1 4.69 10.67c.02 9.91-7.31 15.22-16.64 10.33-4.3-2.26-8.59-5.7-8.79-8.33a9 9 0 0 1 .06-1.87A1.1 1.1 0 0 1 17 21.8q.29.01.52.16a22 22 0 0 1 3.49 2.99c.53.52.82.8 1.38 1.4 2.05 2.18 6.34 6.73 10.85 3.98 1.78-1.08 3.87-3.46 3.72-8.68-.17-6.4-10.21-12-12.23-13.06-7.17-3.76-13.78-3.52-18.7.7q-1.04.91-1.81 2.06c-5.79 8.58-6.46 18.89 3.23 28.48 4.3 4.25 10.64 7.6 17.07 7.66l.06-3.4c-5.3-1.4-11.47-6.62-13.88-8.94'

const WORDMARK_PATH =
  'M15.6 41.9q-7.25 0-11.21-4.14T.42 25.94a20 20 0 0 1 1.06-6.63 14 14 0 0 1 3.05-5c1.36-1.37 3-2.43 4.8-3.12a18.8 18.8 0 0 1 12.59 0 13 13 0 0 1 7.82 8.12 20 20 0 0 1 1.03 6.63q.05 3.44-1.06 6.7a13.17 13.17 0 0 1-7.84 8.18c-2 .73-4.13 1.1-6.27 1.08m0-6.43A5.9 5.9 0 0 0 20.72 33q1.7-2.47 1.7-7.06t-1.7-7q-1.7-2.4-5.12-2.4c-2.28 0-4.02.8-5.12 2.4s-1.7 3.94-1.7 7 .56 5.46 1.67 7.1q1.65 2.43 5.15 2.43M33.58 35.53l14.63-18.26H33.87v-6.25h24.55v5.45L43.87 34.73h15.24l-.73 6.25h-24.8zM65.94 17.28h-4.72v-6.26h4.72V3.04h8.04v7.98h6.9v6.26h-6.9V31.1q0 2.36.98 3.2c.72.57 1.61.87 2.53.83q.83 0 1.64-.09.83-.1 1.63-.32l1.16 5.91q-1.6.52-3.25.73-1.5.2-3.02.2-4.94 0-7.31-2.34-2.37-2.35-2.39-7.93zM85.3 0h8.28v7.24H85.3zm.12 11.02h8.04v29.93h-8.04zM107.9 25.6 98.05 11h9.51l5.12 8.55 5.75-8.55h8.4l-9.72 14.12 10.46 15.83h-9.35l-6.09-9.7-6.38 9.75H97z'

export type LogoVariant = 'normal' | 'logomark' | 'wordmark' | 'product'

export type LogoProps = ComponentProps<'span'> & {
  /**
   * `normal` is the mark and wordmark, `logomark` and `wordmark` are one part
   * each, and `product` pairs the mark with `children` as the product name.
   * @default 'normal'
   */
  variant?: 'normal' | 'logomark' | 'wordmark' | 'product'
}

let warnedMissingProductName = false

function productNameOf(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children).trim() || undefined
  }
  return undefined
}

function LogoMark() {
  return (
    <svg
      data-slot='logo-mark'
      viewBox='0 0 48 48'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      className='h-full w-auto shrink-0'
    >
      <path d={MARK_PATH} />
    </svg>
  )
}

function LogoWordmark({ className }: { className: string }) {
  return (
    <svg
      data-slot='logo-wordmark'
      viewBox='0 0 128 42'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      className={cn('w-auto shrink-0', className)}
    >
      <path d={WORDMARK_PATH} />
    </svg>
  )
}

export function Logo({
  variant = 'normal',
  className,
  children,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...props
}: LogoProps) {
  const isProduct = variant === 'product'
  const productName = isProduct ? productNameOf(children) : undefined
  const missingProductName = isProduct && (children == null || children === '')

  if (missingProductName && isDev() && !warnedMissingProductName) {
    warnedMissingProductName = true
    console.warn(
      "Roadie Logo: variant='product' needs the product name as children, e.g. <Logo variant='product'>Studio</Logo>."
    )
  }

  const hidden = ariaHidden === true || ariaHidden === 'true'
  const a11y = hidden
    ? { 'aria-hidden': ariaHidden }
    : {
        role: 'img',
        'aria-label':
          ariaLabel ?? (productName ? `Oztix ${productName}` : 'Oztix')
      }

  return (
    <span
      data-slot='logo'
      data-variant={variant}
      className={cn(
        'inline-flex h-[1em] shrink-0 items-center gap-[calc(1em/6)] text-[2rem] leading-none text-subtler intent-brand',
        className
      )}
      {...a11y}
      {...props}
    >
      {variant !== 'wordmark' && <LogoMark />}
      {/* The lockup sets the 42-unit wordmark at the top of the 48-unit mark. */}
      {variant === 'normal' && (
        <LogoWordmark className='h-[87.5%] self-start' />
      )}
      {variant === 'wordmark' && <LogoWordmark className='h-full' />}
      {isProduct && (
        <span
          data-slot='logo-product'
          className='font-sans text-[0.75em] font-black tracking-display whitespace-nowrap [text-box:trim-both_cap_alphabetic]'
        >
          {children}
        </span>
      )}
    </span>
  )
}

Logo.displayName = 'Logo'
