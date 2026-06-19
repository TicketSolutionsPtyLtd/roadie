import { useEffect, useRef } from 'react'

import type { CartClient } from '@oztix/roadie-widgets/cart-drawer/core'

// Bridges the Vue CartDrawer skin into the React docs so the parity bench can
// render either skin from the same controls. Vue + the widget's Vue dist are
// dynamically imported inside the effect so they never load during SSR.
//
// No 'use client' marker: this is only imported by CartDrawerParityDemo (which
// has it), so it already lives in the client graph — and skipping it avoids
// Next's serializable-prop warning on the function props below.

export type VueCartDrawerProps = {
  cart: CartClient
  collectionId: string
  onNavigate: (href: string) => void
  locale: string
  currency: string
  context?: 'collection' | 'event'
  refreshKey?: number
  initialState?: 'closed' | 'open'
  onOpenChange?: (open: boolean) => void
}

// Minimal shape of the Vue runtime bits we use — the package's published types
// resolve to the wrong condition under this tsconfig, so type them locally.
type VueRuntime = {
  createApp: (options: unknown) => {
    mount: (el: Element) => void
    unmount: () => void
  }
  h: (type: unknown, props?: Record<string, unknown>) => unknown
  reactive: <T extends object>(target: T) => T
}

export function VueCartDrawer(props: VueCartDrawerProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  // Latest props, read when (re)applying to the reactive Vue object.
  const latest = useRef(props)
  latest.current = props
  // The Vue-side reactive props object; patched in place so Vue re-renders.
  const reactiveProps = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    let unmount: (() => void) | null = null

    // Docs-only: this page renders BOTH skins, so @number-flow/react and
    // @number-flow/vue both run number-flow's module-load `CSS.registerProperty`
    // for the same @property names. The second registration throws, which makes
    // number-flow's capability check report "can't animate" and silently kills
    // the Vue digit-roll. Real single-skin apps (e.g. Outlet) never hit this.
    // Make re-registration a no-op so the Vue tab animates like React.
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
        import('@oztix/roadie-widgets/cart-drawer/vue')
      ])
      if (cancelled || !elRef.current) return
      const { createApp, h, reactive } = vue
      const CartDrawer = widget.CartDrawer

      const rp = reactive({ ...latest.current }) as Record<string, unknown>
      reactiveProps.current = rp

      const app = createApp({
        // Spread reads every reactive key during render, so Vue tracks them
        // and re-renders when the React side patches the object.
        render: () => h(CartDrawer, { ...rp })
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

  // Patch reactive props on every React render so refreshKey / context / cart
  // changes reach the live Vue tree.
  useEffect(() => {
    if (reactiveProps.current) Object.assign(reactiveProps.current, props)
  })

  return <div ref={elRef} />
}
