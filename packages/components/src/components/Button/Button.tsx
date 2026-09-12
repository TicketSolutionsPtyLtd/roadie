'use client'

import { type MouseEvent, type RefAttributes, useEffect, useRef } from 'react'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { intentVariants } from '../../variants'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export const buttonVariants = cva('btn is-interactive', {
  variants: {
    intent: intentVariants,
    emphasis: {
      strong: 'emphasis-strong',
      normal: 'emphasis-normal',
      subtle: 'emphasis-subtle',
      subtler: 'emphasis-subtler'
    },
    size: {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      'icon-xs': 'btn-icon-xs',
      'icon-sm': 'btn-icon-sm',
      'icon-md': 'btn-icon-md',
      'icon-lg': 'btn-icon-lg'
    }
  },
  defaultVariants: {
    emphasis: 'normal',
    size: 'md'
  }
})

/**
 * Smart-href props. When `href` is present and the consumer hasn't supplied
 * their own `render`, Button renders a `RoadieRoutedLink` styled as a button,
 * with native link semantics, instead of the Base UI Button.
 */
export type ButtonHrefProps = {
  /**
   * Pass a URL to render the button as a routed anchor instead of a
   * `<button>`. Internal hrefs route through the configured
   * `RoadieLinkProvider` (or fall back to plain `<a>`); external hrefs
   * (`http(s)://`, `//…`) render as `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render as plain `<a>`. Pair with
   * `external`, `target`, or `rel` to override the defaults.
   */
  href?: string
  /**
   * Force external-link treatment regardless of `href` shape. Useful for
   * first-party URLs that should still open in a new tab, or for an
   * `https://` URL that should route internally through the provider.
   */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
  /** Download the `href` instead of navigating, optionally as this filename. */
  download?: boolean | string
}

export type ButtonProps = ButtonPrimitive.Props &
  RefAttributes<HTMLElement> &
  VariantProps<typeof buttonVariants> &
  ButtonHrefProps

export function Button({
  className,
  intent,
  emphasis,
  size,
  href,
  external,
  target,
  rel,
  download,
  nativeButton,
  ...props
}: ButtonProps) {
  // Consumer `render` always wins — it's the canonical escape hatch for
  // full element control. When `href` is also passed, the routed link is
  // bypassed; warn in dev once per mount so the silent
  // disable doesn't get shipped accidentally. Use a ref so StrictMode's
  // double-render and ordinary re-renders don't multiply the warn.
  const hasWarnedRef = useRef(false)
  useEffect(() => {
    if (props.render && href !== undefined && !hasWarnedRef.current) {
      hasWarnedRef.current = true
      if (isDev()) {
        console.warn(
          '[Roadie] Button received both `href` and `render` — `render` wins, provider routing is disabled. Pick one: pass `href` for smart routing, or pass `render` for full element control.'
        )
      }
    }
  }, [props.render, href])

  const classes = cn(buttonVariants({ intent, emphasis, size, className }))

  if (!props.render && href !== undefined) {
    const {
      disabled = false,
      focusableWhenDisabled,
      style,
      tabIndex,
      onClick,
      ref,
      ...rest
    } = props

    return (
      <RoadieRoutedLink
        data-slot='button'
        className={classes}
        href={href}
        external={external}
        target={target}
        rel={rel}
        download={download}
        {...(rest as Record<string, unknown>)}
        ref={ref as RefAttributes<HTMLAnchorElement>['ref']}
        style={typeof style === 'function' ? style({ disabled }) : style}
        {...(disabled
          ? {
              'aria-disabled': true,
              'data-disabled': '',
              tabIndex: focusableWhenDisabled ? tabIndex : -1,
              onClick: (event: MouseEvent) => event.preventDefault()
            }
          : {
              tabIndex,
              onClick: onClick as (event: MouseEvent) => void
            })}
      />
    )
  }

  return (
    <ButtonPrimitive
      nativeButton={nativeButton ?? !props.render}
      data-slot='button'
      className={classes}
      {...props}
    />
  )
}

Button.displayName = 'Button'
