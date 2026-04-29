'use client'

import { type RefAttributes, useEffect, useRef } from 'react'

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
 * Smart-href props layered on top of the Base UI Button. When `href` is
 * present and the consumer hasn't supplied their own `render`, Button
 * synthesises `render={<RoadieRoutedLink href={…} … />}` so the right
 * element + routing is picked automatically.
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
  ...props
}: ButtonProps) {
  // Consumer `render` always wins — it's the canonical escape hatch for
  // full element control. When `href` is also passed, the synthesized
  // routing is bypassed; warn in dev once per mount so the silent
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

  // If consumer didn't supply `render` and `href` is set, synthesize a
  // routed anchor. RoadieRoutedLink applies external/target/rel rules and
  // reads the configured Link from context.
  const synthesizedRender =
    !props.render && href !== undefined ? (
      <RoadieRoutedLink
        href={href}
        external={external}
        target={target}
        rel={rel}
      />
    ) : undefined

  // Base UI's `nativeButton` defaults to `true`; when render is set
  // (synthesized or consumer-provided), flip to false so it renders as
  // the chosen element instead of a `<button>`.
  const finalRender = props.render ?? synthesizedRender

  return (
    <ButtonPrimitive
      nativeButton={!finalRender}
      data-slot='button'
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
      render={finalRender}
    />
  )
}

Button.displayName = 'Button'
