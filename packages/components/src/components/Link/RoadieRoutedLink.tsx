'use client'

import {
  type AnchorHTMLAttributes,
  type ComponentProps,
  type MouseEvent,
  type Ref
} from 'react'

import { usePendingNavigationStore } from '../../providers/PendingNavigationContext'
import { useRoadieLink } from '../../providers/RoadieLinkContext'
import { isDev } from '../../utils/isDev'
import { isPlainLinkClick } from '../../utils/isPlainLinkClick'
import { resolveLinkKind } from '../../utils/resolveLinkKind'

/**
 * Internal client-side anchor used by every Roadie surface that opts
 * into smart-href routing. Reads {@link useRoadieLink} once, classifies
 * the `href`, and renders one of:
 *
 * - **External** (`https://…`, `//…`): plain `<a>` with
 *   `target='_blank' rel='noopener noreferrer'` defaults that consumers
 *   can override per-call.
 * - **Protocol** (`mailto:`, `tel:`, `sms:`): plain `<a>`. No `target`,
 *   no `rel`.
 * - **Internal**: the configured Link component if a provider is wired,
 *   otherwise a plain `<a>` fallback.
 * - **Unsafe** (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`):
 *   refused. Renders `<a href='#'>` so the click is inert, and logs a
 *   dev-only warning. These protocols never have a legitimate place in
 *   navigation; passing them is almost always a bug or an attack
 *   vector reaching a user-controlled href.
 *
 * Not exported from `@oztix/roadie-components`. Smart-href components
 * (Button, Card, Breadcrumb, Carousel, Tabs) compose this internally.
 */
export type RoadieRoutedLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  /**
   * Override the auto external/internal classification. `true` forces
   * `target='_blank' rel='noopener'` defaults; `false` forces routing
   * through the configured Link (useful for first-party URLs that look
   * external, e.g. the consumer's own `https://oztix.com.au/x` links
   * inside the app).
   */
  external?: boolean
  ref?: Ref<HTMLAnchorElement>
}

export function RoadieRoutedLink({
  href,
  external,
  target,
  rel,
  ref,
  ...rest
}: RoadieRoutedLinkProps) {
  // Per-branch compiler caches outweigh this small routing adapter.
  'use no memo'
  const Link = useRoadieLink()
  const kind = resolveLinkKind(href)
  const store = usePendingNavigationStore()
  const consumerClick = rest.onClick
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    consumerClick?.(event)
    if (isPlainLinkClick(event) && !href.startsWith('#')) store?.start()
  }

  if (kind === 'unsafe') {
    if (isDev()) {
      console.warn(
        '[Roadie] Unsafe href blocked: ' +
          JSON.stringify(href) +
          '. See /foundations/linking.'
      )
    }
    return <a ref={ref} href='#' {...rest} />
  }

  if (kind === 'protocol') {
    return <a ref={ref} href={href} {...rest} />
  }

  const isExternal = external ?? kind === 'external'

  if (isExternal) {
    return (
      <a
        ref={ref}
        href={href}
        target={target ?? '_blank'}
        rel={rel ?? 'noopener noreferrer'}
        {...rest}
      />
    )
  }

  if (Link) {
    const linkProps: ComponentProps<typeof Link> = {
      href,
      ref,
      ...(target !== undefined && { target }),
      ...(rel !== undefined && { rel }),
      ...rest,
      // Only here: a plain `<a>` unloads the document, and the browser shows that wait.
      onClick
    }
    // The provider's component, not one made here, so its identity is stable.
    // eslint-disable-next-line react-hooks/static-components
    return <Link {...linkProps} />
  }

  return (
    <a
      ref={ref}
      href={href}
      {...(target !== undefined && { target })}
      {...(rel !== undefined && { rel })}
      {...rest}
    />
  )
}

RoadieRoutedLink.displayName = 'RoadieRoutedLink'
