import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { MARK_PATH } from './markPath'
import { TAGLINE_PATH } from './taglinePath'

const WORDMARK_PATH =
  'M15.6 41.9q-7.25 0-11.21-4.14T.42 25.94a20 20 0 0 1 1.06-6.63 14 14 0 0 1 3.05-5c1.36-1.37 3-2.43 4.8-3.12a18.8 18.8 0 0 1 12.59 0 13 13 0 0 1 7.82 8.12 20 20 0 0 1 1.03 6.63q.05 3.44-1.06 6.7a13.17 13.17 0 0 1-7.84 8.18c-2 .73-4.13 1.1-6.27 1.08m0-6.43A5.9 5.9 0 0 0 20.72 33q1.7-2.47 1.7-7.06t-1.7-7q-1.7-2.4-5.12-2.4c-2.28 0-4.02.8-5.12 2.4s-1.7 3.94-1.7 7 .56 5.46 1.67 7.1q1.65 2.43 5.15 2.43M33.58 35.53l14.63-18.26H33.87v-6.25h24.55v5.45L43.87 34.73h15.24l-.73 6.25h-24.8zM65.94 17.28h-4.72v-6.26h4.72V3.04h8.04v7.98h6.9v6.26h-6.9V31.1q0 2.36.98 3.2c.72.57 1.61.87 2.53.83q.83 0 1.64-.09.83-.1 1.63-.32l1.16 5.91q-1.6.52-3.25.73-1.5.2-3.02.2-4.94 0-7.31-2.34-2.37-2.35-2.39-7.93zM85.3 0h8.28v7.24H85.3zm.12 11.02h8.04v29.93h-8.04zM107.9 25.6 98.05 11h9.51l5.12 8.55 5.75-8.55h8.4l-9.72 14.12 10.46 15.83h-9.35l-6.09-9.7-6.38 9.75H97z'

export type LogoVariant = 'normal' | 'mark' | 'wordmark' | 'tagline' | 'product'
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type LogoDirection = 'horizontal' | 'vertical'
export type LogoTone = 'brand' | 'dark' | 'light' | 'neutral'

type LogoBaseProps = Omit<ComponentProps<'span'>, 'children' | 'dir'> & {
  /**
   * The mark and wordmark colour. `brand` is Oztix blue, `dark` is near-black for light backgrounds, and `light` is white for dark, brand, or photo backgrounds, each the same in light and dark mode. `neutral` is one colour that follows the theme.
   * @default 'brand'
   */
  tone?: 'brand' | 'dark' | 'light' | 'neutral'
  /**
   * The logo's height, or the mark's when vertical: `xs` 20px, `sm` 24px, `md` 32px, `lg` 40px, `xl` 48px.
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

// One member per lockup family, so a prop a lockup can't use is a type error.
type LogoLockupProps =
  | {
      /**
       * The lockup. `normal` is the mark and wordmark, and `tagline` adds a divider and Built on Partnerships. `mark` is the mark alone, and `wordmark` is a collapse state of the full logo. `product` sets a product name in place of the wordmark. `powered-by` and `proud-sponsor` are planned.
       * @default 'normal'
       */
      variant?: 'normal' | 'tagline'
      /**
       * `vertical` sets the wordmark, and any tagline, under the mark, for square spaces. Only `normal` and `tagline` take it.
       * @default 'horizontal'
       */
      direction?: 'horizontal' | 'vertical'
      product?: never
    }
  | {
      variant: 'mark' | 'wordmark'
      direction?: never
      product?: never
    }
  | {
      variant?: 'product'
      /** Product name set as live text in place of the wordmark, naming the logo `Oztix {product}`. Implies `variant='product'`. */
      product: string
      direction?: never
    }

export type LogoProps = LogoBaseProps & LogoLockupProps

const sizeClassName: Record<LogoSize, string> = {
  xs: 'text-[20px]',
  sm: 'text-[24px]',
  md: 'text-[32px]',
  lg: 'text-[40px]',
  xl: 'text-[48px]'
}

// The brand tagline and divider follow the theme, like the brand pack's on-light and on-dark artwork.
const toneClassName: Record<
  LogoTone,
  { logo: string; tagline: string; divider: string }
> = {
  brand: {
    logo: 'text-brand-9',
    tagline: 'intent-neutral text-normal',
    divider: 'border-normal'
  },
  dark: {
    logo: 'text-(--color-neutral-light-13)',
    tagline: 'text-(--color-neutral-light-12)',
    divider: 'border-(--color-neutral-light-5)'
  },
  light: {
    logo: 'text-(--color-neutral-light-0)',
    tagline: '',
    divider: 'border-current'
  },
  neutral: {
    logo: 'intent-neutral text-strong',
    tagline: 'text-normal',
    divider: 'border-normal'
  }
}

function LogoMark() {
  return (
    <svg
      data-slot='logo-mark'
      viewBox='0 0 48 48'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      className='block size-[1em] shrink-0'
    >
      <path d={MARK_PATH} />
    </svg>
  )
}

function LogoWordmark(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox='0 0 128 42'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      {...props}
      className={cn('block aspect-[128/42] w-auto shrink-0', props.className)}
    >
      <path d={WORDMARK_PATH} />
    </svg>
  )
}

function LogoTagline(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox='0 0 271 38'
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
      {...props}
      className={cn('block aspect-[271/38] w-auto shrink-0', props.className)}
    >
      <path d={TAGLINE_PATH} />
    </svg>
  )
}

// A gap spacer, not padding, so a parent can collapse this column to 0fr.
function LogoPart({
  slot,
  className,
  gap = 'gap-[calc(1em/6)]',
  children
}: {
  slot: string
  className?: string
  gap?: string
  children: ReactNode
}) {
  return (
    <span
      data-slot={slot}
      className={cn(
        'grid min-w-0 grid-cols-[1fr] self-stretch overflow-hidden',
        className
      )}
    >
      <span className={cn('flex min-w-0 items-center before:shrink-0', gap)}>
        {children}
      </span>
    </span>
  )
}

function accessibleName(lockup: LogoVariant, productName?: string) {
  if (lockup === 'product') return `Oztix ${productName}`
  return lockup === 'tagline' ? 'Oztix, Built on Partnerships' : 'Oztix'
}

// A product name wins over any variant, as it did before variants were typed.
function resolveLockup(variant: LogoVariant, productName?: string) {
  if (productName) return 'product'
  return variant === 'product' ? 'normal' : variant
}

export function Logo({
  variant = 'normal',
  product,
  direction = 'horizontal',
  tone = 'brand',
  size = 'md',
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...props
}: LogoProps) {
  const productName = product?.trim()
  const lockup = resolveLockup(variant, productName)
  const fullLogo = lockup === 'normal' || lockup === 'tagline'
  const showTagline = lockup === 'tagline'
  const vertical = direction === 'vertical' && fullLogo
  const colour = toneClassName[tone]

  const hidden = ariaHidden === true || ariaHidden === 'true'
  const a11y = hidden
    ? { 'aria-hidden': ariaHidden }
    : {
        role: 'img',
        'aria-label': ariaLabel ?? accessibleName(lockup, productName)
      }

  return (
    <span
      data-slot='logo'
      data-variant={lockup}
      className={cn(
        vertical
          ? 'inline-grid shrink-0 justify-items-center gap-[calc(1em/12)]'
          : 'inline-flex h-[1em] shrink-0 items-center',
        colour.logo,
        sizeClassName[size],
        className
      )}
      {...a11y}
      {...props}
      // The lockup is a fixed brand shape; RTL pages must not mirror it.
      dir='ltr'
    >
      {lockup !== 'wordmark' && <LogoMark />}
      {vertical && (
        <>
          <LogoWordmark
            data-slot='logo-wordmark'
            className='h-auto w-[1.5em]'
          />
          {showTagline && (
            <LogoTagline
              data-slot='logo-tagline'
              className={cn('h-auto w-[1.5em]', colour.tagline)}
            />
          )}
        </>
      )}
      {!vertical && fullLogo && (
        <LogoPart slot='logo-wordmark'>
          {/* The lockup sets the 42-unit wordmark at the top of the 48-unit mark. */}
          <LogoWordmark className='h-[0.875em] self-start' />
        </LogoPart>
      )}
      {!vertical && showTagline && (
        <LogoPart
          slot='logo-tagline'
          className={colour.tagline}
          gap='gap-[calc(1em/3)]'
        >
          <span
            data-slot='logo-divider'
            className={cn(
              'self-stretch border-l-[length:max(1px,calc(1em/48))]',
              colour.divider
            )}
          />
          <LogoTagline className='h-[calc(1em*38/48)]' />
        </LogoPart>
      )}
      {lockup === 'wordmark' && (
        <LogoWordmark data-slot='logo-wordmark' className='h-[1em]' />
      )}
      {lockup === 'product' && (
        <LogoPart slot='logo-product'>
          <span className='font-sans text-[0.75em] leading-none font-black tracking-display whitespace-nowrap [text-box:trim-both_cap_alphabetic]'>
            {productName}
          </span>
        </LogoPart>
      )}
    </span>
  )
}

Logo.displayName = 'Logo'
