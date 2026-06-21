import { useEffect, useRef } from 'react'

import type { CartDetails } from '@oztix/roadie-widgets/cart'

// Bridges the Vue CartContents skin into the React docs so the parity bench can
// render either skin from the same controls. Vue + the widget's Vue dist are
// dynamically imported inside the effect so they never load during SSR. Mirrors
// VueCartDrawer.
//
// No 'use client' marker: only imported by CartContentsParityDemo (which has
// it), so it already lives in the client graph — and skipping it avoids Next's
// serializable-prop warning on the function props below.

export type VueCartContentsProps = {
  cart: CartDetails
  onNavigate: (href: string) => void
  browseHref: string
  checkoutUrl: string | null
  locale: string
  currency: string
  fillHeight?: boolean
  hideFooter?: boolean
  busy?: boolean
  onRemoveEvent?: (eventId: string) => void
}

type VueRuntime = {
  createApp: (options: unknown) => {
    mount: (el: Element) => void
    unmount: () => void
  }
  h: (type: unknown, props?: Record<string, unknown>) => unknown
  reactive: <T extends object>(target: T) => T
}

export function VueCartContents(props: VueCartContentsProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const latest = useRef(props)
  latest.current = props
  const reactiveProps = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    let unmount: (() => void) | null = null

    // Docs-only: this page renders BOTH skins, so @number-flow/react and
    // @number-flow/vue both run number-flow's module-load `CSS.registerProperty`
    // for the same @property names. The second registration throws, which kills
    // the Vue digit-roll. Make re-registration a no-op (real single-skin apps
    // never hit this).
    const css = CSS as unknown as {
      registerProperty?: (d: PropertyDefinition) => void
      __nfDupePatched?: boolean
    }
    if (css.registerProperty && !css.__nfDupePatched) {
      const original = css.registerProperty.bind(CSS)
      css.registerProperty = (def) => {
        try {
          original(def)
        } catch {
          /* already registered by the other skin's number-flow build */
        }
      }
      css.__nfDupePatched = true
    }

    void (async () => {
      const [vue, widget] = await Promise.all([
        import('vue') as unknown as Promise<VueRuntime>,
        import('@oztix/roadie-widgets/cart-contents/vue')
      ])
      if (cancelled || !elRef.current) return
      const { createApp, h, reactive } = vue
      const CartContents = widget.CartContents

      const rp = reactive({ ...latest.current }) as Record<string, unknown>
      reactiveProps.current = rp

      const app = createApp({
        // `removeEvent` is a Vue emit; `onRemoveEvent` registers the listener.
        render: () => h(CartContents, { ...rp })
      })
      app.mount(elRef.current)
      unmount = () => app.unmount()
    })()

    return () => {
      cancelled = true
      unmount?.()
      reactiveProps.current = null
    }
  }, [])

  // Patch reactive props every render so toggles / cart changes reach Vue.
  useEffect(() => {
    if (reactiveProps.current) Object.assign(reactiveProps.current, props)
  })

  // display:contents so the mounted Vue root lays out as a direct child of the
  // frame — its fillHeight min-h-full resolves against the frame's height, just
  // like the React skin rendered without a wrapper.
  return <div ref={elRef} className='contents' />
}
